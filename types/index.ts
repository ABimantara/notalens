// ============================================================
// NotaLens - TypeScript Types (sesuai ERD)
// ============================================================

export interface User {
  user_id: number;
  name: string;
  email: string;
  password?: string; // dihilangkan saat response ke client
  created_at: string;
}

export interface Workspace {
  workspace_id: number;
  name: string;
  join_code: string;
  creator_id: number;
  created_at: string;
}

export interface WorkspaceMember {
  id: number;
  workspace_id: number;
  user_id: number;
  joined_at: string;
}

export interface Transaction {
  transaction_id: number;
  user_id: number;
  workspace_id: number | null;
  category: 'personal' | 'organization' | null;
  merchant_name: string | null;
  total_amount: number;
  tax_amount: number | null;
  transaction_date: string;
  /** Expense label from scan UI (Groceries, etc.) */
  notes: string | null;
  receipt_url: string | null;
  created_at: string;
}

export interface TransactionWithItems extends Transaction {
  items: TransactionItem[];
}

export interface TransactionItem {
  item_id: number;
  transaction_id: number;
  item_name: string;
  quantity: number | null;
  price: number;
}

// -------- Request/Response Types --------

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface ResetPasswordRequest {
  email: string;
  newPassword: string;
}

export interface AuthResponse {
  message: string;
  token?: string;
  user?: Omit<User, 'password'>;
}

export interface ApiError {
  error: string;
}

export interface ReceiptItem {
  nama_item: string;
  harga: string | number | null;
  qty?: number | null;
  subtotal?: number | null;
}

export interface ReceiptExtraction {
  nama_toko: string;
  tanggal: string | null;
  kategori: string | null;
  items: ReceiptItem[];
  pajak: number | null;
  total_pengeluaran: string | number | null;
}

export interface UploadResponse {
  message: string;
  data: ReceiptExtraction;
}

export interface CreateTransactionItemInput {
  item_name: string;
  price: number;
  quantity?: number;
}

export interface TransactionListResponse {
  transactions: TransactionWithItems[];
  summary: {
    total_expenses: number;
    by_category: { name: string; amount: number }[];
  };
}

export interface CreateTransactionResponse {
  message: string;
  transaction: TransactionWithItems;
}

export interface JWTPayload {
  user_id: number;
  email: string;
  iat?: number;
  exp?: number;
}
