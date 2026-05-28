# NotaLens AI — Backend Setup


## Instalasi

```bash
git clone https://github.com/ABimantara/notalens.git
cd NotaLens-AI

python -m venv venv
source venv/bin/activate      # Mac/Linux
venv\Scripts\activate         # Windows

pip install -r requirements.txt
```

## Jalankan Server

```bash
uvicorn app:app --host 0.0.0.0 --port 8000 --reload
```

## Test Endpoint

Buka `http://localhost:8000/docs` untuk UI testing otomatis dari FastAPI.
