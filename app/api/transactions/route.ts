// ============================================================
// GET  /api/transactions?month=&year=&limit=
// POST /api/transactions  (multipart: fields + receipt file)
// ============================================================
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { parseIdrAmount, parseTransactionDate } from '@/lib/amount';
import { uploadReceiptImage } from '@/lib/receipt-storage';
import {
  ApiError,
  CreateTransactionResponse,
  TransactionListResponse,
  TransactionWithItems,
  CreateTransactionItemInput,
} from '@/types';
import type { ReceiptItem } from '@/types';

function getUserId(req: NextRequest): number | null {
  const id = req.headers.get('x-user-id');
  if (!id) return null;
  const n = Number(id);
  return Number.isFinite(n) ? n : null;
}

function mapItemsFromJson(raw: string | null): CreateTransactionItemInput[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as ReceiptItem[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((row) => row.nama_item?.trim())  // skip blank-name items
      .map((row) => ({
        item_name: row.nama_item.trim(),
        price: parseIdrAmount(row.harga),
        quantity: 1,
      }));
  } catch {
    return [];
  }
}

export async function GET(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) {
    return NextResponse.json<ApiError>({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const month = searchParams.get('month');
  const year = searchParams.get('year');
  const limitParam = searchParams.get('limit');
  const limit = limitParam ? Math.min(Number(limitParam), 100) : 50;

  try {
    let query = supabaseAdmin
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('transaction_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (month && year) {
      const m = Number(month);
      const y = Number(year);
      if (Number.isFinite(m) && Number.isFinite(y)) {
        const start = `${y}-${String(m).padStart(2, '0')}-01`;
        const endDate = new Date(y, m, 0);
        const end = `${y}-${String(m).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`;
        query = query.gte('transaction_date', start).lte('transaction_date', end);
      }
    }

    if (limitParam) {
      query = query.limit(limit);
    }

    const { data: transactions, error: txError } = await query;

    if (txError) {
      console.error('List transactions error:', txError);
      return NextResponse.json<ApiError>(
        { error: 'Gagal memuat transaksi' },
        { status: 500 }
      );
    }

    const ids = (transactions ?? []).map((t) => t.transaction_id);
    let itemsByTx: Record<number, TransactionWithItems['items']> = {};

    if (ids.length > 0) {
      const { data: items, error: itemsError } = await supabaseAdmin
        .from('transaction_items')
        .select('*')
        .in('transaction_id', ids);

      if (itemsError) {
        console.error('List items error:', itemsError);
      } else {
        itemsByTx = (items ?? []).reduce(
          (acc, item) => {
            const key = item.transaction_id;
            if (!acc[key]) acc[key] = [];
            acc[key].push(item);
            return acc;
          },
          {} as Record<number, TransactionWithItems['items']>
        );
      }
    }

    const withItems: TransactionWithItems[] = (transactions ?? []).map((t) => ({
      ...t,
      total_amount: Number(t.total_amount),
      items: itemsByTx[t.transaction_id] ?? [],
    }));

    const byCategoryMap = new Map<string, number>();
    for (const t of withItems) {
      const cat = t.notes?.trim() || 'Other';
      byCategoryMap.set(cat, (byCategoryMap.get(cat) ?? 0) + Number(t.total_amount));
    }

    const summary = {
      total_expenses: withItems.reduce((s, t) => s + Number(t.total_amount), 0),
      by_category: [...byCategoryMap.entries()]
        .map(([name, amount]) => ({ name, amount }))
        .sort((a, b) => b.amount - a.amount),
    };

    return NextResponse.json<TransactionListResponse>({
      transactions: withItems,
      summary,
    });
  } catch (err) {
    console.error('GET transactions error:', err);
    return NextResponse.json<ApiError>(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const userId = getUserId(req);
  if (!userId) {
    return NextResponse.json<ApiError>({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const merchant_name = (formData.get('merchant_name') as string)?.trim();
    const transaction_date_raw = formData.get('transaction_date') as string;
    const expense_category = (formData.get('expense_category') as string)?.trim() || 'Other';
    const total_amount_raw = formData.get('total_amount') as string;
    const itemsJson = formData.get('items') as string | null;
    const receiptFile = formData.get('receipt') as File | null;

    if (!merchant_name) {
      return NextResponse.json<ApiError>(
        { error: 'Nama toko wajib diisi' },
        { status: 400 }
      );
    }

    const total_amount = parseIdrAmount(total_amount_raw);
    if (total_amount <= 0) {
      return NextResponse.json<ApiError>(
        { error: 'Total amount tidak valid' },
        { status: 400 }
      );
    }

    const transaction_date = parseTransactionDate(transaction_date_raw);
    const lineItems = mapItemsFromJson(itemsJson);

    let receipt_url: string | null = null;
    if (receiptFile && receiptFile.size > 0) {
      receipt_url = await uploadReceiptImage(userId, receiptFile);
    }

    const { data: transaction, error: insertError } = await supabaseAdmin
      .from('transactions')
      .insert({
        user_id: userId,
        workspace_id: null,
        category: 'personal',
        merchant_name,
        total_amount,
        tax_amount: null,
        transaction_date,
        notes: expense_category,
        receipt_url,
      })
      .select()
      .single();

    if (insertError || !transaction) {
      console.error('Insert transaction error:', insertError);
      return NextResponse.json<ApiError>(
        { error: 'Gagal menyimpan transaksi. Pastikan tabel Supabase sudah dibuat.' },
        { status: 500 }
      );
    }

    let savedItems: TransactionWithItems['items'] = [];

    if (lineItems.length > 0) {
      const rows = lineItems.map((item) => ({
        transaction_id: transaction.transaction_id,
        item_name: item.item_name,
        quantity: item.quantity ?? 1,
        price: item.price,
      }));

      const { data: items, error: itemsError } = await supabaseAdmin
        .from('transaction_items')
        .insert(rows)
        .select();

      if (itemsError) {
        console.error('Insert items error:', itemsError);
        await supabaseAdmin
          .from('transactions')
          .delete()
          .eq('transaction_id', transaction.transaction_id);
        return NextResponse.json<ApiError>(
          { error: 'Gagal menyimpan item transaksi' },
          { status: 500 }
        );
      }
      savedItems = items ?? [];
    }

    const result: TransactionWithItems = {
      ...transaction,
      total_amount: Number(transaction.total_amount),
      items: savedItems,
    };

    return NextResponse.json<CreateTransactionResponse>(
      { message: 'Transaksi berhasil disimpan', transaction: result },
      { status: 201 }
    );
  } catch (err) {
    console.error('POST transactions error:', err);
    return NextResponse.json<ApiError>(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
