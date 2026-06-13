/** Parse Indonesian-style amounts: "64.500", "64,500", "Rp 64.500", or plain number 64500 → 64500 */
export function parseIdrAmount(value: string | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return Number.isFinite(value) ? Math.round(value) : 0;
  let s = value.replace(/^Rp\.?\s?/i, '').trim();
  if (!s) return 0;

  const hasComma = s.includes(',');
  const hasDot = s.includes('.');

  if (hasComma && hasDot) {
    const lastComma = s.lastIndexOf(',');
    const lastDot = s.lastIndexOf('.');
    if (lastComma > lastDot) {
      s = s.replace(/\./g, '').replace(',', '.');
    } else {
      s = s.replace(/,/g, '');
    }
  } else if (hasComma) {
    const parts = s.split(',');
    if (parts.length === 2 && parts[1].length <= 2) {
      s = parts[0].replace(/\./g, '') + '.' + parts[1];
    } else {
      s = s.replace(/,/g, '');
    }
  } else if (hasDot) {
    const parts = s.split('.');
    if (parts.length > 2 || (parts.length === 2 && parts[1].length === 3)) {
      s = s.replace(/\./g, '');
    }
  }

  const n = parseFloat(s);
  return Number.isFinite(n) ? Math.round(n) : 0;
}

/** Best-effort date for DB (YYYY-MM-DD). Falls back to today. */
export function parseTransactionDate(raw: string | null | undefined): string {
  if (!raw?.trim()) {
    return new Date().toISOString().slice(0, 10);
  }

  const trimmed = raw.trim();

  const iso = trimmed.match(/^(\d{4})[-./](\d{1,2})[-./](\d{1,2})$/);
  if (iso) {
    const [, y, m, d] = iso;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  const dmy = trimmed.match(/^(\d{1,2})[-./](\d{1,2})[-./](\d{4})$/);
  if (dmy) {
    const [, d, m, y] = dmy;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  const parsed = Date.parse(trimmed);
  if (!Number.isNaN(parsed)) {
    return new Date(parsed).toISOString().slice(0, 10);
  }

  return new Date().toISOString().slice(0, 10);
}

export function formatRp(n: number): string {
  return 'Rp ' + Math.abs(n).toLocaleString('id-ID');
}

export function formatDisplayDate(isoDate: string | null | undefined): string {
  if (!isoDate) return '—';
  try {
    // Handle both plain dates (YYYY-MM-DD) and full ISO timestamps
    const dateStr = isoDate.includes('T') ? isoDate : isoDate + 'T12:00:00';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return isoDate;
    // Indonesian month names
    const MONTHS_ID = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des']
    return `${d.getDate()} ${MONTHS_ID[d.getMonth()]} ${d.getFullYear()}`;
  } catch {
    return isoDate;
  }
}
