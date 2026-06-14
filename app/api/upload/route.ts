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

const rawUrl = process.env.FASTAPI_URL ?? 'http://localhost:8000';
// Ensure protocol prefix and no trailing slash
const FASTAPI_URL = (rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`).replace(/\/+$/, '');

export async function POST(req: NextRequest) {
  console.log('[upload] === START ===');
  console.log('[upload] FASTAPI_URL:', FASTAPI_URL);

  // --- Auth check ---
  const token = getTokenFromHeader(req.headers.get('authorization'));
  const payload = token ? await verifyToken(token) : null;

  if (!payload) {
    console.log('[upload] Auth failed — no valid token');
    return NextResponse.json<ApiError>(
      { error: 'Unauthorized - login terlebih dahulu' },
      { status: 401 }
    );
  }
  console.log('[upload] Auth OK, user_id:', payload.user_id);

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      console.log('[upload] No file in request');
      return NextResponse.json<ApiError>(
        { error: 'File tidak ditemukan dalam request' },
        { status: 400 }
      );
    }

    console.log('[upload] File received:', file.name, '| type:', file.type, '| size:', file.size, 'bytes');

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
    if (!allowedTypes.includes(file.type)) {
      console.log('[upload] Rejected file type:', file.type);
      return NextResponse.json<ApiError>(
        { error: 'Format file tidak didukung. Gunakan JPG, PNG, atau WEBP' },
        { status: 400 }
      );
    }

    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      console.log('[upload] File too large:', file.size);
      return NextResponse.json<ApiError>(
        { error: 'Ukuran file maksimal 10MB' },
        { status: 400 }
      );
    }

    const forwardForm = new FormData();
    forwardForm.append('file', file);

    const targetUrl = `${FASTAPI_URL}/ekstrak-struk`;
    console.log('[upload] Forwarding to FastAPI:', targetUrl);
    console.log('[upload] Full URL:', new URL(targetUrl).toString());
    console.log('[upload] File being sent:', file.name, file.type, file.size);

// Add this BEFORE the fetch to see if URL is correct
    console.log('[upload] Endpoint path:', new URL(targetUrl).pathname);      

    let fastApiResponse: Response;
    const startTime = Date.now();
    try {
      fastApiResponse = await fetch(targetUrl, {
        method: 'POST',
        body: forwardForm,
        signal: AbortSignal.timeout(120_000), // 2min — HF Space cold start can be slow
      });
    } catch (fetchErr) {
      console.error('[upload] FastAPI fetch error:', fetchErr);
      return NextResponse.json<ApiError>(
        { error: `Server AI tidak dapat dihubungi (${FASTAPI_URL}). Error: ${String(fetchErr)}` },
        { status: 502 }
      );
    }

    const elapsed = Date.now() - startTime;
    console.log('[upload] FastAPI responded in', elapsed, 'ms | status:', fastApiResponse.status);

    if (!fastApiResponse.ok) {
      const errText = await fastApiResponse.text();
      console.error('[upload] FastAPI error response:', errText.slice(0, 500));
      return NextResponse.json<ApiError>(
        { error: `Gagal memproses struk (AI ${fastApiResponse.status}): ${errText.slice(0, 200)}` },
        { status: 502 }
      );
    }

    const result = await fastApiResponse.json();
    console.log('[upload] FastAPI result keys:', Object.keys(result));
    console.log('[upload] === SUCCESS ===');

    return NextResponse.json({
      message: 'Struk berhasil diproses',
      data: result,
    });
  } catch (err) {
    console.error('[upload] Unexpected error:', err);
    return NextResponse.json<ApiError>(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
