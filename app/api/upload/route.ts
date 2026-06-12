// ============================================================
// POST /api/upload
// Header: Authorization: Bearer <token>
// Body: FormData dengan field "file" (gambar struk)
//
// Flow: FE → Next.js (auth check) → FastAPI (OCR processing)
// ============================================================
import { NextRequest, NextResponse } from 'next/server';
import { getTokenFromHeader, verifyToken } from '@/lib/jwt';
import { ApiError } from '@/types';

const FASTAPI_URL = process.env.FASTAPI_URL ?? 'http://localhost:8000';

export async function POST(req: NextRequest) {
  // --- Auth check ---
  // Middleware already validated the token and injected x-user-id,
  // but we re-verify here so the route is self-contained.
  const token = getTokenFromHeader(req.headers.get('authorization'));
  const payload = token ? await verifyToken(token) : null;

  if (!payload) {
    return NextResponse.json<ApiError>(
      { error: 'Unauthorized - login terlebih dahulu' },
      { status: 401 }
    );
  }

  try {
    // --- Ambil file dari request ---
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json<ApiError>(
        { error: 'File tidak ditemukan dalam request' },
        { status: 400 }
      );
    }

    // Validasi tipe file
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json<ApiError>(
        { error: 'Format file tidak didukung. Gunakan JPG, PNG, atau WEBP' },
        { status: 400 }
      );
    }

    // Validasi ukuran file (max 10MB)
    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json<ApiError>(
        { error: 'Ukuran file maksimal 10MB' },
        { status: 400 }
      );
    }

    // --- Forward ke FastAPI ---
    const forwardForm = new FormData();
    forwardForm.append('file', file);

    const fastApiResponse = await fetch(`${FASTAPI_URL}/ekstrak-struk`, {
      method: 'POST',
      body: forwardForm,
    });

    if (!fastApiResponse.ok) {
      const errText = await fastApiResponse.text();
      console.error('FastAPI error:', errText);
      return NextResponse.json<ApiError>(
        { error: 'Gagal memproses struk, coba lagi' },
        { status: 502 }
      );
    }

    const result = await fastApiResponse.json();

    return NextResponse.json({
      message: 'Struk berhasil diproses',
      data: result,
    });
  } catch (err) {
    console.error('Upload error:', err);
    return NextResponse.json<ApiError>(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Tingkatkan limit body size untuk upload file
export const config = {
  api: {
    bodyParser: false,
  },
};