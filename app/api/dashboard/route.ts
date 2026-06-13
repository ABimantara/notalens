// ============================================================
// GET /api/dashboard
// Header: Authorization: Bearer <token>
//
// Ambil statistik dashboard untuk user yang sedang login:
// - Total pengeluaran personal
// - Jumlah struk
// - Pengeluaran per bulan (6 bulan terakhir)
// - Workspace & event yang diikuti
// ============================================================
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { ApiError } from '@/types';

export async function GET(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  if (!userId) {
    return NextResponse.json<ApiError>({ error: 'Unauthorized' }, { status: 401 });
  }

  const numUserId = Number(userId);

  // Ambil semua transaksi user
  const { data: transactions, error: txError } = await supabaseAdmin
    .from('transactions')
    .select('transaction_id, total_amount, transaction_date, merchant_name, event_id, workspace_id')
    .eq('user_id', numUserId)
    .order('transaction_date', { ascending: false });

  if (txError) {
    console.error('Dashboard stats error:', txError);
    return NextResponse.json<ApiError>({ error: 'Gagal mengambil data dashboard' }, { status: 500 });
  }

  const allTx = transactions ?? [];

  // Total keseluruhan
  const totalAmount = allTx.reduce((sum, tx) => sum + Number(tx.total_amount), 0);
  const totalScans = allTx.length;

  // Pengeluaran 6 bulan terakhir
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
  sixMonthsAgo.setDate(1);

  const monthlyMap: Record<string, number> = {};
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    monthlyMap[key] = 0;
  }

  for (const tx of allTx) {
    if (!tx.transaction_date) continue;
    const key = tx.transaction_date.substring(0, 7); // "YYYY-MM"
    if (key in monthlyMap) {
      monthlyMap[key] += Number(tx.total_amount);
    }
  }

  const monthlyStats = Object.entries(monthlyMap).map(([month, amount]) => ({
    month,
    amount,
  }));

  // Jumlah workspace yang diikuti
  const { count: workspaceCount } = await supabaseAdmin
    .from('workspace_members')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', numUserId);

  // Jumlah event yang diikuti
  const { count: eventCount } = await supabaseAdmin
    .from('event_participants')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', numUserId);

  // 5 transaksi terbaru
  const recentTransactions = allTx.slice(0, 5);

  return NextResponse.json({
    summary: {
      total_amount: totalAmount,
      total_scans: totalScans,
      total_workspaces: workspaceCount ?? 0,
      total_events: eventCount ?? 0,
    },
    monthly_stats: monthlyStats,
    recent_transactions: recentTransactions,
  });
}
