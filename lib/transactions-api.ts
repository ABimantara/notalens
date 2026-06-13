import { getToken } from '@/lib/auth';
import type { CreateTransactionResponse, TransactionListResponse } from '@/types';
import type { ReceiptItem } from '@/types';

function authHeaders(): HeadersInit {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function fetchTransactions(params?: {
  month?: number;
  year?: number;
  limit?: number;
  workspace_id?: number | string;
}): Promise<TransactionListResponse | null> {
  const qs = new URLSearchParams();
  if (params?.month) qs.set('month', String(params.month));
  if (params?.year) qs.set('year', String(params.year));
  if (params?.limit) qs.set('limit', String(params.limit));
  if (params?.workspace_id) qs.set('workspace_id', String(params.workspace_id));

  const res = await fetch(`/api/transactions?${qs}`, {
    headers: authHeaders(),
  });
  if (!res.ok) return null;
  return res.json();
}

export async function saveTransaction(input: {
  merchant_name: string;
  transaction_date: string;
  expense_category: string;
  tax_amount?: string;
  total_amount: string;
  items: ReceiptItem[];
  receipt?: File | null;
  workspace_id?: number | null;
}): Promise<{ ok: true; data: CreateTransactionResponse } | { ok: false; error: string }> {
  const token = getToken();
  if (!token) return { ok: false, error: 'Silakan login terlebih dahulu' };

  const body = new FormData();
  body.append('merchant_name', input.merchant_name);
  body.append('transaction_date', input.transaction_date);
  body.append('expense_category', input.expense_category);
  if (input.tax_amount) body.append('tax_amount', input.tax_amount);
  body.append('total_amount', input.total_amount);
  body.append('items', JSON.stringify(input.items));
  if (input.receipt) body.append('receipt', input.receipt);
  if (input.workspace_id) body.append('workspace_id', String(input.workspace_id));

  const res = await fetch('/api/transactions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body,
  });

  const json = await res.json();
  if (!res.ok) {
    return { ok: false, error: json.error || 'Gagal menyimpan' };
  }
  return { ok: true, data: json };
}
