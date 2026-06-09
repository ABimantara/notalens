// ============================================================
// POST /api/upload
// Header: Authorization: Bearer <token>
// Body: FormData dengan field "file" (gambar struk)
//
// Flow:
//   FE → Next.js (auth check) → FastAPI (OCR)
//       → parse response → simpan ke Supabase (transactions + transaction_items)
//       → return hasil ke FE
//
// Asumsi shape response FastAPI /ocr/process:
// {
//   merchant_name: string | null,
//   total_amount: number,
//   tax_amount: number | null,
//   transaction_date: string | null,  // ISO date string, e.g. "2024-03-15"
//   items: Array<{
//     item_name: string,
//     quantity: number | null,
//     price: number,
//   }>
// }
// ============================================================
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { ApiError } from '@/types';

const FASTAPI_URL = process.env.FASTAPI_URL ?? 'http://localhost:8000';

// ── Tipe response dari FastAPI ────────────────────────────────
interface FastApiOcrResult {
  merchant_name: string | null;
  total_amount: number;
  tax_amount: number | null;
  transaction_date: string | null;
  items: Array<{
    item_name: string;
    quantity: number | null;
    price: number;
  }>;
}

export async function POST(req: NextRequest) {
  // user_id di-inject middleware via x-user-id header
  const userId = req.headers.get('x-user-id');

  if (!userId) {
    return NextResponse.json<ApiError>(
      { error: 'Unauthorized - login terlebih dahulu' },
      { status: 401 }
    );
  }

  try {
    // ── 1. Ambil & validasi file ──────────────────────────────
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json<ApiError>(
        { error: 'File tidak ditemukan dalam request' },
        { status: 400 }
      );
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json<ApiError>(
        { error: 'Format file tidak didukung. Gunakan JPG, PNG, atau WEBP' },
        { status: 400 }
      );
    }

    const MAX_SIZE = 10 * 1024 * 1024; // 10MB
    if (file.size > MAX_SIZE) {
      return NextResponse.json<ApiError>(
        { error: 'Ukuran file maksimal 10MB' },
        { status: 400 }
      );
    }

    // ── 2. Forward ke FastAPI ─────────────────────────────────
    const forwardForm = new FormData();
    forwardForm.append('file', file);
    forwardForm.append('user_id', userId);

    const fastApiResponse = await fetch(`${FASTAPI_URL}/ocr/process`, {
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

    const ocrResult: FastApiOcrResult = await fastApiResponse.json();

    // ── 3. Simpan transaction ke Supabase ─────────────────────
    const { data: transaction, error: txError } = await supabaseAdmin
      .from('transactions')
      .insert({
        user_id: Number(userId),
        workspace_id: null,        // bisa diisi nanti kalau user pilih workspace
        category: 'personal',
        merchant_name: ocrResult.merchant_name ?? null,
        total_amount: ocrResult.total_amount,
        tax_amount: ocrResult.tax_amount ?? null,
        transaction_date: ocrResult.transaction_date
          ? ocrResult.transaction_date
          : new Date().toISOString().split('T')[0], // fallback: hari ini
        notes: null,
        receipt_url: null,         // kalau nanti ada upload ke storage, isi di sini
      })
      .select('transaction_id')
      .single();

    if (txError || !transaction) {
      console.error('Supabase insert transaction error:', txError);
      return NextResponse.json<ApiError>(
        { error: 'Gagal menyimpan transaksi ke database' },
        { status: 500 }
      );
    }

    // ── 4. Simpan transaction_items ke Supabase ───────────────
    if (ocrResult.items && ocrResult.items.length > 0) {
      const itemRows = ocrResult.items.map((item) => ({
        transaction_id: transaction.transaction_id,
        item_name: item.item_name,
        quantity: item.quantity ?? null,
        price: item.price,
      }));

      const { error: itemsError } = await supabaseAdmin
        .from('transaction_items')
        .insert(itemRows);

      if (itemsError) {
        // Transaksi sudah tersimpan, tapi items gagal.
        // Log error & tetap return sukses dengan peringatan.
        console.error('Supabase insert items error:', itemsError);
      }
    }

    // ── 5. Return hasil ke FE ─────────────────────────────────
    return NextResponse.json({
      message: 'Struk berhasil diproses dan disimpan',
      transaction_id: transaction.transaction_id,
      data: ocrResult,
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
