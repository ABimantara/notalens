# NotaLens 📸

Smart Receipt Intelligence — Aplikasi mobile web untuk manajemen pengeluaran pribadi melalui pemindaian struk belanja.

## 📱 Tentang Aplikasi

NotaLens adalah aplikasi yang memungkinkan pengguna untuk:
- Scan struk belanja menggunakan kamera atau galeri
- Ekstraksi data struk otomatis menggunakan AI (YOLO + EasyOCR + Gemini)
- Manajemen pengeluaran pribadi dan per workspace/event
- Rekap pengeluaran bulanan dengan export PDF/Excel
- Dark mode & light mode

## 🛠️ Tech Stack

### Frontend
- **Next.js 16** (App Router)
- **TypeScript**
- **React Context** (Theme, Navigation)

### Backend
- **Next.js API Routes**
- **Supabase** (PostgreSQL)
- **JWT Authentication**
- **bcryptjs**

### AI/OCR
- **FastAPI** (backend API berbasis Python)
- **YOLOv11** (deteksi area struk)
- **EasyOCR** (ekstraksi teks dari struk)
- **Gemini** (konversi hasil OCR ke format JSON)

## 📊 Dataset
Model YOLOv11 dilatih menggunakan kombinasi dua dataset struk:
1. **SPLIVU Receipt Dataset (Roboflow)**
   - Sumber: https://app.roboflow.com/ahmad-rizki-sabani/splivu-12yrv/1
   - Digunakan untuk anotasi area struk pada gambar.
2. **Receipt Dataset YOLO (Kaggle)**
   - Sumber: https://www.kaggle.com/datasets/kartikdullet/receipt-dataset-yolo
   - Digunakan sebagai data tambahan untuk meningkatkan variasi dan generalisasi model.

## 🚀 Cara Menjalankan

### Prerequisites
- Node.js v20+
- Python 3.10+
- Git

### 1. Clone Repository
```bash
git clone https://github.com/ABimantara/notalens.git
cd notalens
```

### 2. Setup Environment
```bash
cp .env.example .env.local
```

Isi `.env.local` dengan nilai yang sesuai:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
JWT_SECRET=your-jwt-secret
FASTAPI_URL=http://localhost:8000
```

### 3. Install Dependencies & Jalankan Next.js
```bash
npm install
npm run dev
```

Aplikasi berjalan di `http://localhost:3000`

### 4. Setup & Jalankan FastAPI (AI Server)
```bash
cd ai
python -m venv venv
venv\Scripts\activate  # Windows
# atau
source venv/bin/activate  # Mac/Linux

pip install -r requirements.txt
uvicorn app:app --host 0.0.0.0 --port 8000 --reload
```

FastAPI berjalan di `http://localhost:8000`

> ⚠️ **Kedua server harus berjalan bersamaan** untuk fitur scan berfungsi.
