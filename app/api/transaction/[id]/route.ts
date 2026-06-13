// ============================================================
// GET    /api/transaction/[id]  — detail transaksi
// PUT    /api/transaction/[id]  — edit (submitter ATAU workspace creator)
// PATCH  /api/transaction/[id]  — verifikasi (workspace creator only)
// DELETE /api/transaction/[id]  — hapus (submitter ATAU workspace creator)
// ============================================================
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { parseIdrAmount, parseTransactionDate } from '@/lib/amount';
import { uploadReceiptImage, deleteReceiptImage } from '@/lib/receipt-storage';
import { ApiError } from '@/types';
import type { ReceiptItem } from '@/types';

type Params = { params: Promise<{ id: string }> };

// Helper — check if user can access this transaction (submitter or workspace creator)
async function getAccessLevel(transactionId: number, userId: number) {
  const { data: tx, error } = await supabaseAdmin
    .from('transactions')
    .select('transaction_id, user_id, workspace_id')
    .eq('transaction_id', transactionId)
    .single();

  if (error || !tx) return { tx: null, role: null as null };

  // If the transaction belongs to a workspace, check creator status FIRST
  // so a creator who also submitted gets 'creator' role (not 'submitter')
  if (tx.workspace_id) {
    const { data: ws } = await supabaseAdmin
      .from('workspaces')
      .select('creator_id')
      .eq('workspace_id', tx.workspace_id)
      .single();

    if (ws && Number(ws.creator_id) === userId) return { tx, role: 'creator' as const };
  }

  // Submitter check (personal transactions or non-creator workspace member who submitted)
  if (Number(tx.user_id) === userId) return { tx, role: 'submitter' as const };

  // Other workspace members (read-only)
  if (tx.workspace_id) {
    const { data: member, error: memberErr } = await supabaseAdmin
      .from('workspace_members')
      .select('id')
      .eq('workspace_id', tx.workspace_id)
      .eq('user_id', userId)
      .maybeSingle();
    if (!memberErr && member) return { tx, role: 'member' as const };
  }

  console.warn(`getAccessLevel: no role for userId=${userId}, tx.user_id=${tx.user_id}, workspace_id=${tx.workspace_id}`);
  return { tx: null, role: null as null };
}

function remapItems(raw: unknown) {
  const items = Array.isArray(raw) ? raw : [];
  return items;
}

// ── GET ──────────────────────────────────────────────────────
export async function GET(req: NextRequest, { params }: Params) {
  const userId = Number(req.headers.get('x-user-id'));
  if (!userId) return NextResponse.json<ApiError>({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const { role } = await getAccessLevel(Number(id), userId);
  if (!role) return NextResponse.json<ApiError>({ error: 'Transaksi tidak ditemukan atau akses ditolak' }, { status: 404 });

  const { data: transaction, error } = await supabaseAdmin
    .from('transactions')
    .select(`
      transaction_id, user_id, workspace_id, category,
      merchant_name, total_amount, tax_amount, transaction_date,
      notes, receipt_url, created_at, verified, verified_by, verified_at,
      transaction_items(item_id, item_name, quantity, price)
    `)
    .eq('transaction_id', Number(id))
    .single();

  if (error || !transaction) {
    console.error('GET transaction error:', error?.message, 'id:', Number(id));
    return NextResponse.json<ApiError>({ error: 'Transaksi tidak ditemukan' }, { status: 404 });
  }

  const { transaction_items, ...txRest } = transaction as typeof transaction & { transaction_items?: unknown };
  return NextResponse.json({
    transaction: { ...txRest, items: remapItems(transaction_items) },
    role,
  });
}

// ── PATCH — verify/unverify (workspace creator only) ─────────
export async function PATCH(req: NextRequest, { params }: Params) {
  const userId = Number(req.headers.get('x-user-id'));
  if (!userId) return NextResponse.json<ApiError>({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const transactionId = Number(id);

  const { tx, role } = await getAccessLevel(transactionId, userId);
  if (!tx) return NextResponse.json<ApiError>({ error: 'Transaksi tidak ditemukan' }, { status: 404 });
  if (role !== 'creator') return NextResponse.json<ApiError>({ error: 'Hanya creator workspace yang bisa memverifikasi' }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const verified: boolean = body.verified ?? true;

  // NOTE: verification fields (verified, verified_by, verified_at) require migration.
  // Run schema.sql in Supabase SQL Editor before using verify feature.
  const { error } = await supabaseAdmin
    .from('transactions')
    .update({
      verified,
      verified_by: verified ? userId : null,
      verified_at: verified ? new Date().toISOString() : null,
    })
    .eq('transaction_id', transactionId);

  if (error) {
    console.error('PATCH verify error:', error.message);
    return NextResponse.json<ApiError>({ error: 'Gagal memverifikasi. Pastikan kolom verified sudah ada di tabel transactions.' }, { status: 500 });
  }
  return NextResponse.json({ message: verified ? 'Transaksi diverifikasi' : 'Verifikasi dibatalkan', verified });
}

// ── PUT ──────────────────────────────────────────────────────
export async function PUT(req: NextRequest, { params }: Params) {
  const userId = Number(req.headers.get('x-user-id'));
  if (!userId) return NextResponse.json<ApiError>({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const transactionId = Number(id);

  const { tx, role } = await getAccessLevel(transactionId, userId);
  if (!tx) return NextResponse.json<ApiError>({ error: 'Transaksi tidak ditemukan' }, { status: 404 });
  if (role !== 'submitter' && role !== 'creator') {
    return NextResponse.json<ApiError>({ error: 'Akses ditolak' }, { status: 403 });
  }

  try {
    const formData = await req.formData();
    const merchant_name = (formData.get('merchant_name') as string)?.trim();
    const transaction_date_raw = formData.get('transaction_date') as string;
    const expense_category = (formData.get('expense_category') as string)?.trim() || 'Other';
    const total_amount_raw = formData.get('total_amount') as string;
    const tax_amount_raw = formData.get('tax_amount') as string | null;
    const itemsJson = formData.get('items') as string | null;

    if (!merchant_name) return NextResponse.json<ApiError>({ error: 'Nama toko wajib diisi' }, { status: 400 });

    const total_amount = parseIdrAmount(total_amount_raw);
    if (total_amount <= 0) return NextResponse.json<ApiError>({ error: 'Total amount tidak valid' }, { status: 400 });

    const tax_amount = tax_amount_raw ? parseIdrAmount(tax_amount_raw) : null;
    const transaction_date = parseTransactionDate(transaction_date_raw);

    const receiptFile = formData.get('receipt') as File | null;
    let receipt_url: string | undefined = undefined;
    if (receiptFile && receiptFile.size > 0) {
      // Fetch old receipt_url before overwriting so we can delete it
      const { data: oldTx } = await supabaseAdmin
        .from('transactions')
        .select('receipt_url')
        .eq('transaction_id', transactionId)
        .single();

      const uploaded = await uploadReceiptImage(userId, receiptFile);
      if (uploaded) {
        receipt_url = uploaded;
        // Delete old receipt from storage after successful upload
        await deleteReceiptImage(oldTx?.receipt_url);
      }
    }

    const { error: updateError } = await supabaseAdmin
      .from('transactions')
      .update({
        merchant_name, total_amount, tax_amount, transaction_date,
        notes: expense_category,
        ...(receipt_url !== undefined ? { receipt_url } : {}),
      })
      .eq('transaction_id', transactionId);

    if (updateError) return NextResponse.json<ApiError>({ error: 'Gagal mengupdate transaksi' }, { status: 500 });

    if (itemsJson !== null) {
      await supabaseAdmin.from('transaction_items').delete().eq('transaction_id', transactionId);
      let parsedItems: ReceiptItem[] = [];
      try { parsedItems = JSON.parse(itemsJson); } catch { parsedItems = []; }
      const newItems = parsedItems
        .filter(r => r.nama_item?.trim())
        .map(r => ({
          transaction_id: transactionId,
          item_name: r.nama_item.trim(),
          quantity: (typeof r.qty === 'number' && r.qty > 0) ? r.qty : 1,
          price: parseIdrAmount(r.harga),
        }));
      if (newItems.length > 0) {
        const { error: itemsError } = await supabaseAdmin.from('transaction_items').insert(newItems);
        if (itemsError) return NextResponse.json<ApiError>({ error: 'Gagal mengupdate item' }, { status: 500 });
      }
    }

    const { data: updated } = await supabaseAdmin
      .from('transactions')
      .select(`
        transaction_id, user_id, workspace_id, category,
        merchant_name, total_amount, tax_amount, transaction_date,
        notes, receipt_url, created_at,
        transaction_items(item_id, item_name, quantity, price)
      `)
      .eq('transaction_id', transactionId)
      .single();
    const { transaction_items: updatedItems, ...updatedRest } = (updated ?? {}) as typeof updated & { transaction_items?: unknown };
    return NextResponse.json({
      message: 'Transaksi berhasil diupdate',
      transaction: { ...updatedRest, items: remapItems(updatedItems) },
    });
  } catch (err) {
    console.error('PUT transaction error:', err);
    return NextResponse.json<ApiError>({ error: 'Internal server error' }, { status: 500 });
  }
}

// ── DELETE ───────────────────────────────────────────────────
export async function DELETE(req: NextRequest, { params }: Params) {
  const userId = Number(req.headers.get('x-user-id'));
  if (!userId) return NextResponse.json<ApiError>({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const transactionId = Number(id);

  const { tx, role } = await getAccessLevel(transactionId, userId);
  if (!tx) return NextResponse.json<ApiError>({ error: 'Transaksi tidak ditemukan' }, { status: 404 });
  if (role !== 'submitter' && role !== 'creator') {
    return NextResponse.json<ApiError>({ error: 'Akses ditolak' }, { status: 403 });
  }

  await supabaseAdmin.from('transaction_items').delete().eq('transaction_id', transactionId);

  // Fetch receipt_url before deleting the row
  const { data: txForDelete } = await supabaseAdmin
    .from('transactions')
    .select('receipt_url')
    .eq('transaction_id', transactionId)
    .single();

  const { error } = await supabaseAdmin.from('transactions').delete().eq('transaction_id', transactionId);
  if (error) return NextResponse.json<ApiError>({ error: 'Gagal menghapus transaksi' }, { status: 500 });

  // Clean up receipt image from storage
  await deleteReceiptImage(txForDelete?.receipt_url);

  return NextResponse.json({ message: 'Transaksi berhasil dihapus' });
}
