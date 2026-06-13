import cv2
import re
import json
import numpy as np
import easyocr
from google import genai
from google.genai import types
from fastapi import FastAPI, UploadFile, File, HTTPException
from ultralytics import YOLO
import os
from dotenv import load_dotenv

YOLO_MODEL_PATH = "models/best.pt"
load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

app = FastAPI(title="NotaLens AI API", version="2.0.0")
try:
    model_yolo = YOLO(YOLO_MODEL_PATH)
    reader = easyocr.Reader(['id', 'en'], gpu=False, verbose=False)
    client_llm = genai.Client(api_key=GEMINI_API_KEY)
except Exception as e:
    raise RuntimeError(f"Gagal memuat model: {e}")

def preprocess_receipt(image):
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    clahe_img = clahe.apply(gray)
    
    return clahe_img

def detect_and_crop(image, conf=0.1, padding=30):
    results = model_yolo(image, conf=conf)[0]
    if len(results.boxes) == 0:
        return image
    best_box = results.boxes[results.boxes.conf.argmax()]
    x1, y1, x2, y2 = map(int, best_box.xyxy[0].tolist())
    
    h, w = image.shape[:2]
    x1 = max(0, x1 - padding)
    y1 = max(0, y1 - padding)
    x2 = min(w, x2 + padding)
    y2 = min(h, y2 + padding)
    
    cropped = image[y1:y2, x1:x2]
    ch, cw = cropped.shape[:2]
    min_side = 600
    if min(ch, cw) < min_side:
        scale = min_side / min(ch, cw)
        new_w = int(cw * scale)
        new_h = int(ch * scale)
        cropped = cv2.resize(cropped, (new_w, new_h), interpolation=cv2.INTER_CUBIC)
    
    return cropped


def run_ocr(preprocessed_image):
    results = reader.readtext(preprocessed_image)
    lines = [text for (_, text, conf) in results if conf > 0.1]
    return "\n".join(lines)

KATEGORI_LIST = [
    "Groceries",
    "Food & Beverage",
    "Transportation",
    "Shopping",
    "Health",
    "Entertainment",
    "Other",
]

def parse_with_llm(raw_text: str) -> dict:
    kategori_options = ", ".join(f'"{k}"' for k in KATEGORI_LIST)
    prompt = f"""Kamu adalah asisten yang bertugas mengekstrak informasi dari teks struk belanja.

Teks OCR mentah dari struk:
\"\"\"
{raw_text}
\"\"\"

Kembalikan HANYA format JSON berikut, tanpa penjelasan apapun:
{{
  "nama_toko": null,
  "tanggal": null,
  "kategori": null,
  "items": [
    {{
      "nama_item": "string",
      "qty": null,
      "harga": null,
      "subtotal": null
    }}
  ],
  "pajak": null,
  "total_pengeluaran": null
}}

Aturan:
- qty berupa NUMBER (contoh: 2 bukan "2x")
- harga berupa NUMBER (contoh: 12000 bukan "Rp 12.000")
- subtotal berupa NUMBER hasil qty x harga (contoh: qty=2, harga=12000 maka subtotal=24000)
- pajak berupa NUMBER (cari label PPN, VAT, Tax, Pajak, atau sejenisnya di struk; isi null jika tidak ada)
- total_pengeluaran berupa NUMBER (jumlah akhir termasuk pajak)
- Perbaiki typo OCR jika ada
- tanggal dikonversi ke format DD-MM-YYYY apapun format aslinya
- kategori HARUS salah satu dari: {kategori_options}. Pilih berdasarkan jenis toko/item. Jika tidak yakin gunakan "Other"
- Jika tidak ditemukan, isi null (kecuali kategori yang selalu harus diisi)
- Hanya kembalikan JSON, tidak ada teks lain"""

    try:
       response = client_llm.models.generate_content(
                 model="gemini-3.1-flash-lite",
                contents=prompt)
       raw_response = response.text.strip()
       raw_response = re.sub(r'^```json\s*', '', raw_response)
       raw_response = re.sub(r'\s*```$', '', raw_response)
       return json.loads(raw_response)
    except json.JSONDecodeError:
        return {
            "nama_toko": None,
            "tanggal": None,
            "kategori": "Other",
            "items": [],
            "pajak": None,
            "total_pengeluaran": None
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"LLM error: {e}")



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

    cropped = detect_and_crop(img)
    preprocessed = preprocess_receipt(cropped)
    ocr_text = run_ocr(preprocessed)

    if not ocr_text.strip():
        raise HTTPException(status_code=422, detail="Tidak ada teks yang berhasil diekstrak dari gambar.")
    result = parse_with_llm(ocr_text)
    return result