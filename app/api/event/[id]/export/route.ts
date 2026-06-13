// ============================================================
// GET /api/event/[id]/export
// Header: Authorization: Bearer <token>
//
// Export semua data scan dalam event ke format CSV.
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
    .select('event_id, name')
    .eq('event_id', eventId)
    .single();

  if (eventError || !event) {
    return NextResponse.json<ApiError>({ error: 'Event tidak ditemukan' }, { status: 404 });
  }

  // Cek user adalah participant
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

  // Ambil semua transaksi + items
  const { data: transactions, error: txError } = await supabaseAdmin
    .from('transactions')
    .select(`
      transaction_id,
      merchant_name,
      total_amount,
      tax_amount,
      transaction_date,
      notes,
      created_at,
      users(name, email),
      transaction_items(item_name, quantity, price)
    `)
    .eq('event_id', eventId)
    .order('created_at', { ascending: true });

  if (txError) {
    console.error('Export error:', txError);
    return NextResponse.json<ApiError>({ error: 'Gagal mengambil data untuk export' }, { status: 500 });
  }

  // Build CSV
  const csvRows: string[] = [];

  // Header CSV
  csvRows.push(
    'No Laporan,Nama Penycan,Email Penycan,Merchant,Tanggal,Nama Item,Qty,Harga Item,Total Struk,Pajak,Catatan'
  );

  let reportIndex = 1;
  for (const tx of transactions ?? []) {
    const reportNumber = `EVT-${String(eventId).padStart(4, '0')}-${String(reportIndex).padStart(3, '0')}`;
    const user = tx.users as { name: string; email: string } | null;
    const items = tx.transaction_items as Array<{ item_name: string; quantity: number | null; price: number }>;

    if (!items || items.length === 0) {
      // Transaksi tanpa item detail
      csvRows.push(
        [
          reportNumber,
          user?.name ?? '',
          user?.email ?? '',
          tx.merchant_name ?? '',
          tx.transaction_date ?? '',
          '-',
          '-',
          '-',
          tx.total_amount,
          tx.tax_amount ?? 0,
          tx.notes ?? '',
        ]
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(',')
      );
    } else {
      // Satu baris per item
      for (const item of items) {
        csvRows.push(
          [
            reportNumber,
            user?.name ?? '',
            user?.email ?? '',
            tx.merchant_name ?? '',
            tx.transaction_date ?? '',
            item.item_name,
            item.quantity ?? 1,
            item.price,
            tx.total_amount,
            tx.tax_amount ?? 0,
            tx.notes ?? '',
          ]
            .map((v) => `"${String(v).replace(/"/g, '""')}"`)
            .join(',')
        );
      }
    }

    reportIndex++;
  }

  const csvContent = csvRows.join('\n');
  const filename = `laporan-event-${eventId}-${new Date().toISOString().split('T')[0]}.csv`;

  return new NextResponse(csvContent, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
