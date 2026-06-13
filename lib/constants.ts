// ── Category display labels ───────────────────────────────────────────────────
// DB/AI values are English keys; UI shows Indonesian labels.

export const CATEGORY_LABELS: Record<string, string> = {
  'Groceries':       'Kebutuhan Pokok',
  'Food & Beverage': 'Makanan & Minuman',
  'Transportation':  'Transportasi',
  'Shopping':        'Belanja',
  'Health':          'Kesehatan',
  'Entertainment':   'Hiburan',
  'Other':           'Lainnya',
}

/** All valid category DB keys (kept in English for AI/DB compatibility) */
export const CATEGORY_KEYS = Object.keys(CATEGORY_LABELS)

/** Translate a DB category key to its Indonesian label */
export function categoryLabel(key: string | null | undefined): string {
  if (!key) return CATEGORY_LABELS['Other']
  return CATEGORY_LABELS[key] ?? key
}

// ── Month names ───────────────────────────────────────────────────────────────
export const MONTHS_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des',
]

export const MONTHS_FULL = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
]
