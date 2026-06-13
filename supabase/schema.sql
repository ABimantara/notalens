-- ================================================================
-- NotaLens — Full Schema Migration
-- Jalankan seluruh file ini di Supabase SQL Editor.
-- Aman dijalankan berulang kali (idempotent).
-- ================================================================


-- ── 1. USERS ─────────────────────────────────────────────────
-- Tabel users biasanya sudah dibuat oleh Supabase Auth,
-- tapi pastikan kolom avatar_url ada.
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT NULL;


-- ── 2. WORKSPACES ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS workspaces (
  workspace_id BIGSERIAL PRIMARY KEY,
  name         TEXT        NOT NULL,
  join_code    TEXT        NOT NULL UNIQUE,
  creator_id   BIGINT      NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  budget       NUMERIC(14, 2) NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ── 3. WORKSPACE MEMBERS ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS workspace_members (
  id           BIGSERIAL PRIMARY KEY,
  workspace_id BIGINT NOT NULL REFERENCES workspaces(workspace_id) ON DELETE CASCADE,
  user_id      BIGINT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  joined_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(workspace_id, user_id)
);


-- ── 4. TRANSACTIONS ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS transactions (
  transaction_id   BIGSERIAL PRIMARY KEY,
  user_id          BIGINT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  workspace_id     BIGINT NULL REFERENCES workspaces(workspace_id) ON DELETE SET NULL,
  category         TEXT DEFAULT 'personal' CHECK (category IN ('personal', 'organization')),
  merchant_name    TEXT,
  total_amount     NUMERIC(14, 2) NOT NULL DEFAULT 0,
  tax_amount       NUMERIC(14, 2) NULL,
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes            TEXT NULL,
  receipt_url      TEXT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add workspace_id if the table already exists without it
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS workspace_id BIGINT NULL REFERENCES workspaces(workspace_id) ON DELETE SET NULL;

-- Add tax_amount if missing
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(14, 2) NULL;

-- Fix category constraint (drop & recreate to be safe)
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_category_check;
ALTER TABLE transactions ADD CONSTRAINT transactions_category_check
  CHECK (category IN ('personal', 'organization'));


-- ── 5. TRANSACTION ITEMS ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS transaction_items (
  item_id        BIGSERIAL PRIMARY KEY,
  transaction_id BIGINT NOT NULL REFERENCES transactions(transaction_id) ON DELETE CASCADE,
  item_name      TEXT   NOT NULL,
  quantity       INT    NULL DEFAULT 1,
  price          NUMERIC(14, 2) NOT NULL DEFAULT 0
);


-- Add verification columns to transactions
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS verified BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS verified_by BIGINT NULL REFERENCES users(user_id) ON DELETE SET NULL;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ NULL;
CREATE INDEX IF NOT EXISTS idx_transactions_user_date
  ON transactions(user_id, transaction_date DESC);

CREATE INDEX IF NOT EXISTS idx_transactions_workspace
  ON transactions(workspace_id);

CREATE INDEX IF NOT EXISTS idx_workspace_members_user
  ON workspace_members(user_id);


-- ── 7. VERIFY (run these SELECTs to confirm) ─────────────────
-- SELECT column_name, data_type FROM information_schema.columns
--   WHERE table_name = 'transactions' ORDER BY ordinal_position;

-- SELECT column_name, data_type FROM information_schema.columns
--   WHERE table_name = 'workspaces' ORDER BY ordinal_position;

-- SELECT column_name, data_type FROM information_schema.columns
--   WHERE table_name = 'workspace_members' ORDER BY ordinal_position;

-- SELECT column_name, data_type FROM information_schema.columns
--   WHERE table_name = 'users' ORDER BY ordinal_position;


-- ── 8. STORAGE BUCKETS ────────────────────────────────────────
-- Buat manual di Supabase Dashboard → Storage:
--   bucket name: receipts   → Public: ON
--   bucket name: avatars    → Public: ON
