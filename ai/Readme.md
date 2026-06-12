# NotaLens AI — Receipt Scanner API

API untuk scan dan ekstraksi data struk belanja secara otomatis menggunakan AI.

## Pipeline
Input Gambar → YOLO Detection → Preprocessing → EasyOCR → Gemini LLM → JSON

## Baseurl
https://ahmadrizki05-notalens-ai.hf.space
## Endpoints

### GET /
Health check API.

**Response:**
```json
{
  "status": "ok",
  "message": "NotaLens AI API is running"
}
```

---

### POST /ekstrak-struk
Ekstrak data dari gambar struk belanja.

**Request:**
- Method: `POST`
- Content-Type: `multipart/form-data`
- Body: `file` (JPG/PNG)

**Response:**
```json
{
  "nama_toko": "Ai-CHA",
  "tanggal": "09-05-2026",
  "items": [
    {
      "nama_item": "Ai-Milk Tea",
      "qty": 1,
      "harga": 19000,
      "subtotal": 19000
    }
  ],
  "total_pengeluaran": 19000
}
```

**Error Response:**
```json
{
  "detail": "Format file harus JPG atau PNG."
}
```

| Status Code | Keterangan |
|---|---|
| 200 | Berhasil |
| 400 | Format file salah atau gambar tidak terbaca |
| 422 | Teks tidak berhasil diekstrak dari gambar |
| 500 | Internal server error |

## Contoh Penggunaan

### JavaScript (Fetch)
```javascript
const formData = new FormData();
formData.append("file", fileInput.files[0]);

const response = await fetch(
  "https://ahmadrizki05-notalens-ai.hf.space/ekstrak-struk",
  {
    method: "POST",
    body: formData,
  }
);

const data = await response.json();
console.log(data);
```

### Python
```python
import requests

url = "https://ahmadrizki05-notalens-ai.hf.space/ekstrak-struk"
files = {"file": open("struk.jpg", "rb")}
response = requests.post(url, files=files)
print(response.json())
```

## Catatan
- Gambar minimal resolusi **300x300px**
- Format yang didukung: **JPG, PNG**
- Kualitas gambar mempengaruhi akurasi OCR
- Tanggal dengan font kecil atau buram mungkin tidak terbaca

## Tech Stack
- **YOLOv11** — deteksi area struk
- **EasyOCR** — ekstraksi teks
- **Gemini 2.0 Flash** — parsing JSON
- **FastAPI** — REST API
- **Docker** — containerization