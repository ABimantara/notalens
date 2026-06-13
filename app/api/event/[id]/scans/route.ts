// ============================================================
// GET /api/event/[id]/scans
// Header: Authorization: Bearer <token>
//
// Ambil semua data scan (transactions + items) dalam satu event.
// Hanya participant event yang bisa akses.
// ============================================================
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { ApiError } from '@/types';

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const userId = req.headers.get('x-user-id');
  if (!userId) {
    return NextResponse.json<ApiError>({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const eventId = Number(id);

  // Cek event ada
  const { data: event, error: eventError } = await supabaseAdmin
    .from('events')
    .select('event_id, name, workspace_id')
    .eq('event_id', eventId)
    .single();

  if (eventError || !event) {
    return NextResponse.json<ApiError>({ error: 'Event tidak ditemukan' }, { status: 404 });
  }

  // Cek user adalah participant event ini
  const { data: participant } = await supabaseAdmin
    .from('event_participants')
    .select('id')
    .eq('event_id', eventId)
    .eq('user_id', Number(userId))
    .single();

  if (!participant) {
    return NextResponse.json<ApiError>(
      { error: 'Kamu bukan participant event ini' },
      { status: 403 }
    );
  }

  // Ambil semua transaksi dalam event ini beserta items-nya
  const { data: transactions, error: txError } = await supabaseAdmin
    .from('transactions')
    .select(`
      transaction_id,
      user_id,
      merchant_name,
      total_amount,
      tax_amount,
      transaction_date,
      notes,
      receipt_url,
      created_at,
      users(name, email),
      transaction_items(item_id, item_name, quantity, price)
    `)
    .eq('event_id', eventId)
    .order('created_at', { ascending: false });

  if (txError) {
    console.error('Get scans error:', txError);
    return NextResponse.json<ApiError>({ error: 'Gagal mengambil data scan' }, { status: 500 });
  }

  // Hitung nomor laporan otomatis (urut berdasarkan created_at)
  const transactionsWithNumber = (transactions ?? []).map((tx, index) => ({
    report_number: `EVT-${String(eventId).padStart(4, '0')}-${String(index + 1).padStart(3, '0')}`,
    ...tx,
  }));

  // Summary stats
  const totalAmount = (transactions ?? []).reduce((sum, tx) => sum + Number(tx.total_amount), 0);
  const totalScans = (transactions ?? []).length;

  return NextResponse.json({
    event: event.name,
    summary: {
      total_scans: totalScans,
      total_amount: totalAmount,
    },
    transactions: transactionsWithNumber,
  });
}
