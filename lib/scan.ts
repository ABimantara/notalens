import type { ReceiptExtraction, ReceiptItem } from '@/types';

export async function dataUrlToFile(
  dataUrl: string,
  filename = 'receipt.jpg'
): Promise<File> {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  const type = blob.type && blob.type.startsWith('image/') ? blob.type : 'image/jpeg';
  return new File([blob], filename, { type });
}

/**
 * Normalise any price value from the AI response to a plain numeric string
 * (no "Rp" prefix, no thousand separators) that parseIdrAmount can parse.
 * Handles both the old string format ("Rp 43.500") and the new numeric format (43500).
 */
export function parseRpAmount(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return '';
  if (typeof value === 'number') return String(value);
  return value.replace(/^Rp\.?\s*/i, '').trim();
}

/** Parse berbagai format tanggal dari OCR ke YYYY-MM-DD */
export function parseDate(value: string | null | undefined): string {
  if (!value) return new Date().toISOString().split('T')[0]

  const MONTHS: Record<string, string> = {
    jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
    jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
    januari: '01', februari: '02', maret: '03', april: '04', mei: '05',
    juni: '06', juli: '07', agustus: '08', september: '09', oktober: '10',
    november: '11', desember: '12',
  }

  // Format: YYYY-MM-DD atau YYYY/MM/DD
  const isoMatch = value.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/)
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2].padStart(2, '0')}-${isoMatch[3].padStart(2, '0')}`
  }

  // Format: DD/MM/YYYY atau DD-MM-YYYY
  const dmyMatch = value.match(/(\d{1,2})[-/](\d{1,2})[-/](\d{4})/)
  if (dmyMatch) {
    return `${dmyMatch[3]}-${dmyMatch[2].padStart(2, '0')}-${dmyMatch[1].padStart(2, '0')}`
  }

  // Format: "14 Juni 2024" or "10 May 19" (Indonesian or English month names, 2 or 4 digit year)
  const textMatch = value.match(/(\d{1,2})\s+([a-zA-Z]+)\s+(\d{2,4})/)
  if (textMatch) {
    const day = textMatch[1].padStart(2, '0')
    const month = MONTHS[textMatch[2].toLowerCase()] || '01'
    let year = textMatch[3]
    if (year.length === 2) year = '20' + year
    return `${year}-${month}-${day}`
  }

  // Fallback: tanggal hari ini
  return new Date().toISOString().split('T')[0]
}

const VALID_CATEGORIES = [
  'Groceries', 'Food & Beverage', 'Transportation',
  'Shopping', 'Health', 'Entertainment', 'Other',
] as const;

/**
 * Normalise items from AI response — preserve qty, normalise harga to plain
 * numeric string so parseIdrAmount can handle it on the save side.
 */
function normaliseItems(items: ReceiptItem[]): ReceiptItem[] {
  return (items ?? []).map(item => ({
    nama_item: item.nama_item ?? '',
    qty: item.qty ?? 1,
    // Use harga (unit price) for display/save, not subtotal
    harga: parseRpAmount(item.harga) || null,
    subtotal: item.subtotal ?? null,
  }));
}

export function mapReceiptToForm(data: ReceiptExtraction) {
  // Validate AI category against known list, fall back to 'Other'
  const aiCategory = data.kategori?.trim() ?? '';
  const category = (VALID_CATEGORIES as readonly string[]).includes(aiCategory)
    ? aiCategory
    : 'Other';

  return {
    storeName: data.nama_toko || 'Tidak Terdeteksi',
    date: parseDate(data.tanggal),
    category,
    taxAmount: typeof data.pajak === 'number' ? String(data.pajak) : '',
    totalAmount: parseRpAmount(data.total_pengeluaran),
    items: normaliseItems(data.items),
  };
}

export function estimateConfidence(data: ReceiptExtraction): number {
  let score = 0;
  if (data.nama_toko && data.nama_toko !== 'Tidak Terdeteksi') score += 25;
  if (data.tanggal) score += 25;
  if (data.total_pengeluaran) score += 25;
  if (data.items.length > 0) score += 25;
  return score;
}