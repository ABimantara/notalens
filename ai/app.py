import cv2
import re
import json
import numpy as np
import easyocr
from fastapi import FastAPI, UploadFile, File, HTTPException
from ultralytics import YOLO

MODEL_PATH = "models/best2.pt"

app = FastAPI(title="NotaLens AI API", version="1.0.0")

try:
    model_yolo = YOLO(MODEL_PATH)
    reader = easyocr.Reader(['id', 'en'], gpu=False)
except Exception as e:
    raise RuntimeError(f"Gagal memuat model: {e}")


def normalise_price(raw: str) -> str:
    """Normalise a raw price string to 'Rp X.XXX' format."""
    # Remove everything except digits, dots, commas
    digits = re.sub(r'[^\d.,]', '', raw)
    if not digits:
        return raw
    # Indonesian thousands separator: dots → remove, comma → dot for decimals
    if ',' in digits and '.' in digits:
        last_comma = digits.rfind(',')
        last_dot = digits.rfind('.')
        if last_comma > last_dot:
            digits = digits.replace('.', '').replace(',', '.')
        else:
            digits = digits.replace(',', '')
    elif ',' in digits:
        parts = digits.split(',')
        if len(parts) == 2 and len(parts[1]) <= 2:
            digits = parts[0] + '.' + parts[1]
        else:
            digits = digits.replace(',', '')
    elif '.' in digits:
        parts = digits.split('.')
        # multiple dots or 3-digit decimal = thousands separator
        if len(parts) > 2 or (len(parts) == 2 and len(parts[1]) == 3):
            digits = digits.replace('.', '')
    try:
        n = float(digits)
        return f"Rp {n:,.0f}".replace(',', '.')
    except ValueError:
        return f"Rp {digits}"


def parse_receipt(hasil_ekstraksi: list[str], hasil_full: list[str]) -> dict:
    data_struk = {
        "nama_toko": "Tidak Terdeteksi",
        "tanggal": None,
        "items": [],
        "total_pengeluaran": None
    }

    # Price pattern — matches standalone amounts with thousand separators
    pola_harga = re.compile(
        r'(?:Rp\.?\s*)?(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{1,2})?)\b'
    )

    # ── Store name ─────────────────────────────────────────────────────────────
    # Skip lines that look like addresses/phone numbers; take first meaningful line
    skip_patterns = re.compile(
        r'^\d+$|telp|phone|fax|jl\.|jalan|no\.|npwp|www\.|\.com', re.IGNORECASE
    )
    for baris in hasil_full[:5]:
        baris_clean = baris.replace('"', '').strip()
        if baris_clean and not skip_patterns.search(baris_clean) and len(baris_clean) >= 3:
            data_struk["nama_toko"] = baris_clean
            break

    # ── Date ───────────────────────────────────────────────────────────────────
    pola_tanggal = re.compile(
        r'(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}'         # DD/MM/YYYY or DD-MM-YYYY
        r'|\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}'            # YYYY-MM-DD
        r'|\d{1,2}\s+\w+\s+\d{2,4})'                   # 14 Juni 2024
    )
    for baris in hasil_full:
        m = pola_tanggal.search(baris)
        if m:
            data_struk["tanggal"] = m.group(1)
            break

    # ── Total ──────────────────────────────────────────────────────────────────
    # Look for a line containing "total" then grab the largest number on that
    # line or the next line
    total_keywords = re.compile(r'\b(total|grand\s*total|jumlah)\b', re.IGNORECASE)
    for i, baris in enumerate(hasil_full):
        if total_keywords.search(baris):
            # Try same line first, then next line
            candidates = [baris]
            if i + 1 < len(hasil_full):
                candidates.append(hasil_full[i + 1])
            for candidate in candidates:
                matches = pola_harga.findall(candidate)
                if matches:
                    # Pick the largest value (most likely to be the total)
                    best = max(matches, key=lambda x: float(
                        re.sub(r'[.,](?=\d{3})', '', x).replace(',', '.')
                    ) if re.search(r'\d', x) else 0)
                    data_struk["total_pengeluaran"] = normalise_price(best)
                    break
            if data_struk["total_pengeluaran"]:
                break

    # ── Line items from YOLO crops ─────────────────────────────────────────────
    # Each YOLO crop contains one item line. Format varies:
    #   "Indomie Goreng         2.500"   → name then price on same line
    #   "Indomie Goreng"                 → name only (price on next line)
    #   "2.500"                          → price only (name on previous line)
    nama_buffer = None
    for i, baris in enumerate(hasil_ekstraksi):
        baris = baris.strip()
        if not baris or total_keywords.search(baris):
            nama_buffer = None
            continue

        price_matches = pola_harga.findall(baris)

        # Remove price tokens to get the name portion
        nama_portion = pola_harga.sub('', baris).strip(' :-')

        if nama_portion and price_matches:
            # Name and price on same line
            best_price = max(price_matches, key=lambda x: float(
                re.sub(r'[.,](?=\d{3})', '', x).replace(',', '.')
            ) if re.search(r'\d', x) else 0)
            data_struk["items"].append({
                "nama_item": nama_portion,
                "harga": normalise_price(best_price)
            })
            nama_buffer = None

        elif nama_portion and not price_matches:
            # Name only — buffer it, price may follow
            nama_buffer = nama_portion

        elif price_matches and not nama_portion:
            # Price only — attach to buffered name
            best_price = max(price_matches, key=lambda x: float(
                re.sub(r'[.,](?=\d{3})', '', x).replace(',', '.')
            ) if re.search(r'\d', x) else 0)
            price_str = normalise_price(best_price)
            # Don't add if this is the grand total
            if price_str != data_struk["total_pengeluaran"]:
                if nama_buffer:
                    data_struk["items"].append({
                        "nama_item": nama_buffer,
                        "harga": price_str
                    })
                    nama_buffer = None
                else:
                    # Orphan price — skip
                    pass

    return data_struk


@app.get("/")
def root():
    return {"status": "ok", "message": "NotaLens AI API is running"}


@app.post("/ekstrak-struk")
async def ekstrak_struk(file: UploadFile = File(...)):
    if file.content_type not in ["image/jpeg", "image/png", "image/jpg"]:
        raise HTTPException(status_code=400, detail="Format file harus JPG atau PNG.")

    contents = await file.read()
    nparr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    if img is None:
        raise HTTPException(status_code=400, detail="Gambar tidak dapat dibaca.")

    img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)

    # OCR full gambar untuk nama toko, tanggal, dan total
    hasil_full = reader.readtext(img_rgb, detail=0)

    # YOLO + OCR per crop untuk item
    results = model_yolo(img)
    hasil_ekstraksi = []

    if len(results[0].boxes) > 0:
        boxes = results[0].boxes.xyxy.cpu().numpy()
        boxes = sorted(boxes, key=lambda b: b[1])
        for box in boxes:
            x1, y1, x2, y2 = map(int, box)
            cropped_img = img_rgb[y1:y2, x1:x2]
            ocr_result = reader.readtext(cropped_img, detail=0)
            if ocr_result:
                hasil_ekstraksi.append(" ".join(ocr_result))

    if not hasil_ekstraksi:
        raise HTTPException(status_code=422, detail="Tidak ada teks yang berhasil diekstrak dari gambar.")

    return parse_receipt(hasil_ekstraksi, hasil_full)