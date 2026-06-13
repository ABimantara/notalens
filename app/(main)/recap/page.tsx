'use client'
import React, { useState, useEffect, useMemo } from 'react'
import { useNav } from '@/app/components/AppLayout'
import { useTheme } from '@/context/ThemeContext'
import { useRouter } from 'next/navigation'
import { fetchTransactions } from '@/lib/transactions-api'
import { formatRp, formatDisplayDate } from '@/lib/amount'
import { getToken } from '@/lib/auth'
import { MONTHS_SHORT, MONTHS_FULL, categoryLabel } from '@/lib/constants'
import type { TransactionWithItems } from '@/types'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'

const CATEGORY_COLORS = ['#0D307F', '#1e4bb8', '#2d5fd4', '#4a7feb', '#7aa5f5', '#94a3b8']

export default function RecapPage() {
  const { setActiveNav } = useNav()
  const { darkMode } = useTheme()
  const router = useRouter()
  const now = new Date()
  const [monthIndex, setMonthIndex] = useState(now.getMonth())
  const [year, setYear] = useState(now.getFullYear())
  // 'month' = all transactions in selected month
  // 'week'  = transactions in the current real week (Mon–Sun) within selected month
  const [view, setView] = useState<'month' | 'week'>('month')
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerYear, setPickerYear] = useState(now.getFullYear())
  const [transactions, setTransactions] = useState<TransactionWithItems[]>([])
  const [total, setTotal] = useState(0)
  const [byCategory, setByCategory] = useState<{ name: string; amount: number }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { setActiveNav('RECAP') }, [setActiveNav])

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const data = await fetchTransactions({ month: monthIndex + 1, year })
      if (data) {
        setTransactions(data.transactions)
        setTotal(data.summary.total_expenses)
        setByCategory(data.summary.by_category)
      } else {
        setTransactions([])
        setTotal(0)
        setByCategory([])
      }
      setLoading(false)
    }
    load()
  }, [monthIndex, year])

  // Navigate months — wraps year when crossing Jan/Dec
  const prevMonth = () => {
    if (monthIndex === 0) { setMonthIndex(11); setYear(y => y - 1) }
    else setMonthIndex(p => p - 1)
  }
  const nextMonth = () => {
    // Don't go beyond current month
    if (year === now.getFullYear() && monthIndex === now.getMonth()) return
    if (monthIndex === 11) { setMonthIndex(0); setYear(y => y + 1) }
    else setMonthIndex(p => p + 1)
  }
  const isCurrentMonth = year === now.getFullYear() && monthIndex === now.getMonth()

  const filteredTransactions = useMemo(() => {
    if (view === 'month') return transactions

    // 'week': Mon–Sun of the current real-world week, intersected with selected month
    const today = new Date()
    const dayOfWeek = today.getDay() === 0 ? 6 : today.getDay() - 1 // Mon=0 … Sun=6
    const monday = new Date(today)
    monday.setDate(today.getDate() - dayOfWeek)
    monday.setHours(0, 0, 0, 0)
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    sunday.setHours(23, 59, 59, 999)

    return transactions.filter((tx) => {
      const d = new Date(tx.transaction_date + 'T12:00:00')
      return d >= monday && d <= sunday
    })
  }, [transactions, view])

  // Summary totals respect the current view filter
  const viewTotal = useMemo(
    () => filteredTransactions.reduce((s, t) => s + Number(t.total_amount), 0),
    [filteredTransactions]
  )
  const viewByCategory = useMemo(() => {
    const map = new Map<string, number>()
    for (const t of filteredTransactions) {
      const cat = t.notes?.trim() || 'Other'
      map.set(cat, (map.get(cat) ?? 0) + Number(t.total_amount))
    }
    return [...map.entries()]
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount)
  }, [filteredTransactions])

  const maxAmount = Math.max(...viewByCategory.map((c) => c.amount), 1)

  const bg = darkMode ? '#0f172a' : '#f4f7fb'
  const cardBg = darkMode ? '#1e293b' : '#fff'
  const textPrimary = darkMode ? '#f1f5f9' : '#0f172a'
  const textSecondary = darkMode ? '#94a3b8' : '#64748b'
  const borderColor = darkMode ? '#334155' : '#e2e8f0'


  const handleDelete = async (id: string) => {
    if (!confirm('Hapus transaksi ini?')) return

    const token = getToken()
    if (!token) { alert('Silakan login ulang'); return }

    try {
      const res = await fetch(`/api/transaction/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!res.ok) {
        const data = await res.json()
        alert(data.error || 'Gagal menghapus')
        return
      }

      setTransactions(p => p.filter(tx => String(tx.transaction_id) !== id))
    } catch {
      alert('Terjadi kesalahan. Coba lagi.')
    }
  }

  const handleExportPDF = () => {
    const doc = new jsPDF()
    const periodLabel = `${MONTHS_FULL[monthIndex]} ${year}${view === 'week' ? ' — Minggu Ini' : ''}`

    // Header
    doc.setFontSize(18)
    doc.setTextColor(13, 48, 127)
    doc.text('NotaLens', 14, 18)
    doc.setFontSize(11)
    doc.setTextColor(100, 116, 139)
    doc.text('Rekap Pengeluaran Pribadi', 14, 26)
    doc.text(periodLabel, 14, 33)
    doc.setFontSize(12)
    doc.setTextColor(13, 48, 127)
    doc.text(`Total: ${formatRp(viewTotal)}`, 14, 42)

    // One table — each transaction is one row, items listed inside the Items cell
    autoTable(doc, {
      startY: 50,
      head: [['Toko', 'Tanggal', 'Kategori', 'Items', 'Pajak', 'Total']],
      body: filteredTransactions.length
        ? filteredTransactions.map((tx) => {
            const itemsText = tx.items?.length
              ? tx.items.map(it =>
                  `${it.item_name} x${it.quantity ?? 1}  ${formatRp(Number(it.price))}`
                ).join('\n')
              : '—'
            return [
              tx.merchant_name || '—',
              formatDisplayDate(tx.transaction_date),
              categoryLabel(tx.notes),
              itemsText,
              tx.tax_amount != null ? formatRp(Number(tx.tax_amount)) : '—',
              formatRp(Number(tx.total_amount)),
            ]
          })
        : [['—', '—', '—', '—', '—', '—']],
      headStyles: { fillColor: [13, 48, 127], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [239, 246, 255] },
      styles: { fontSize: 9, cellPadding: 5, valign: 'top', overflow: 'linebreak' },
      columnStyles: {
        0: { cellWidth: 28 },
        1: { cellWidth: 22 },
        2: { cellWidth: 22 },
        3: { cellWidth: 68 },
        4: { cellWidth: 22, halign: 'right' },
        5: { cellWidth: 22, halign: 'right' },
      },
    })

    doc.save(`NotaLens_${MONTHS_FULL[monthIndex]}_${year}.pdf`)
  }

  const handleExportExcel = () => {
    const periodLabel = `${MONTHS_FULL[monthIndex]} ${year}${view === 'week' ? ' — Minggu Ini' : ''}`

    const wb = XLSX.utils.book_new()
    const ws: XLSX.WorkSheet = {}
    const merges: XLSX.Range[] = []

    // Helper to write a cell
    const setCell = (r: number, c: number, v: string | number, bold = false) => {
      const ref = XLSX.utils.encode_cell({ r, c })
      ws[ref] = { v, t: typeof v === 'number' ? 'n' : 's', s: bold ? { font: { bold: true } } : undefined }
    }

    // ── Header rows ──────────────────────────────────────────────────────────
    setCell(0, 0, 'NotaLens — Rekap Pengeluaran Pribadi', true)
    setCell(1, 0, `Periode: ${periodLabel}`)
    setCell(2, 0, `Total Pengeluaran: ${formatRp(viewTotal)}`)
    // row 3 blank
    const headerRow = 4
    const headers = ['Toko', 'Tanggal', 'Kategori', 'Nama Item', 'Qty', 'Harga Satuan (Rp)', 'Pajak (Rp)', 'Total (Rp)']
    headers.forEach((h, c) => setCell(headerRow, c, h, true))

    // ── Data rows ─────────────────────────────────────────────────────────────
    let rowIdx = headerRow + 1

    for (const tx of filteredTransactions) {
      const items = tx.items?.length ? tx.items : null
      const rowCount = items ? items.length : 1
      const startRow = rowIdx

      if (items) {
        items.forEach((item, i) => {
          // Merged columns: Toko(0), Tanggal(1), Kategori(2), Pajak(6), Total(7)
          if (i === 0) {
            setCell(rowIdx, 0, tx.merchant_name || '—')
            setCell(rowIdx, 1, formatDisplayDate(tx.transaction_date))
            setCell(rowIdx, 2, categoryLabel(tx.notes))
            setCell(rowIdx, 6, tx.tax_amount != null ? Number(tx.tax_amount) : '—')
            setCell(rowIdx, 7, Number(tx.total_amount))
          }
          // Item-specific columns
          setCell(rowIdx, 3, item.item_name)
          setCell(rowIdx, 4, item.quantity ?? 1)
          setCell(rowIdx, 5, Number(item.price))
          rowIdx++
        })
      } else {
        // No items — single row, leave item columns blank
        setCell(rowIdx, 0, tx.merchant_name || '—')
        setCell(rowIdx, 1, formatDisplayDate(tx.transaction_date))
        setCell(rowIdx, 2, categoryLabel(tx.notes))
        setCell(rowIdx, 3, '—')
        setCell(rowIdx, 4, '')
        setCell(rowIdx, 5, '')
        setCell(rowIdx, 6, tx.tax_amount != null ? Number(tx.tax_amount) : '—')
        setCell(rowIdx, 7, Number(tx.total_amount))
        rowIdx++
      }

      // Add merge ranges for columns that span multiple item rows
      if (rowCount > 1) {
        for (const col of [0, 1, 2, 6, 7]) {
          merges.push({ s: { r: startRow, c: col }, e: { r: startRow + rowCount - 1, c: col } })
        }
      }
    }

    // Total footer
    rowIdx++
    setCell(rowIdx, 6, 'TOTAL', true)
    setCell(rowIdx, 7, viewTotal, true)

    // Set worksheet range
    ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: rowIdx, c: 7 } })
    ws['!merges'] = merges
    ws['!cols'] = [
      { wch: 22 }, // Toko
      { wch: 14 }, // Tanggal
      { wch: 18 }, // Kategori
      { wch: 30 }, // Nama Item
      { wch: 6  }, // Qty
      { wch: 18 }, // Harga
      { wch: 14 }, // Pajak
      { wch: 16 }, // Total
    ]

    XLSX.utils.book_append_sheet(wb, ws, 'Rekap')
    XLSX.writeFile(wb, `NotaLens_${MONTHS_FULL[monthIndex]}_${year}.xlsx`)
  }

  return (
    <div style={{
      height: '100%', overflowY: 'auto', background: bg,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      transition: 'background 0.3s',
    }}>

      {/* ── Sticky header: month navigator + view tabs ── */}
      <div style={{ background: cardBg, borderBottom: `1px solid ${borderColor}`, position: 'sticky', top: 0, zIndex: 10 }}>
        {/* Month / Year row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px 8px' }}>
          <div onClick={prevMonth} style={{ cursor: 'pointer', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px', background: darkMode ? '#334155' : '#f1f5f9' }}>
            <svg width="16" height="16" fill="none" stroke="#0D307F" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg>
          </div>

          {/* Tappable label — opens picker */}
          <div
            onClick={() => { setPickerYear(year); setPickerOpen(p => !p) }}
            style={{ textAlign: 'center', cursor: 'pointer', userSelect: 'none', position: 'relative' }}
          >
            <div style={{ fontSize: '16px', fontWeight: 800, color: textPrimary }}>{MONTHS_FULL[monthIndex]}</div>
            <div style={{ fontSize: '11px', color: textSecondary, fontWeight: 600 }}>{year}</div>
            {/* Chevron sits below, centered, doesn't affect text width */}
            <svg
              width="12" height="12" fill="none" stroke="#0D307F" strokeWidth="2.5" viewBox="0 0 24 24"
              style={{
                display: 'block', margin: '2px auto 0',
                transform: pickerOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s',
              }}
            >
              <path d="M6 9l6 6 6-6"/>
            </svg>
          </div>

          <div
            onClick={nextMonth}
            style={{
              cursor: isCurrentMonth ? 'default' : 'pointer',
              width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: '8px', background: darkMode ? '#334155' : '#f1f5f9',
              opacity: isCurrentMonth ? 0.3 : 1,
            }}
          >
            <svg width="16" height="16" fill="none" stroke="#0D307F" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6"/></svg>
          </div>
        </div>

        {/* Month picker dropdown */}
        {pickerOpen && (
          <div style={{ padding: '0 16px 14px' }}>
            {/* Year selector inside picker */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div
                onClick={() => setPickerYear(p => p - 1)}
                style={{ cursor: 'pointer', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '6px', background: darkMode ? '#334155' : '#f1f5f9' }}
              >
                <svg width="14" height="14" fill="none" stroke="#0D307F" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg>
              </div>
              <span style={{ fontSize: '14px', fontWeight: 700, color: textPrimary }}>{pickerYear}</span>
              <div
                onClick={() => { if (pickerYear < now.getFullYear()) setPickerYear(p => p + 1) }}
                style={{
                  cursor: pickerYear >= now.getFullYear() ? 'default' : 'pointer',
                  width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  borderRadius: '6px', background: darkMode ? '#334155' : '#f1f5f9',
                  opacity: pickerYear >= now.getFullYear() ? 0.3 : 1,
                }}
              >
                <svg width="14" height="14" fill="none" stroke="#0D307F" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6"/></svg>
              </div>
            </div>

            {/* 4×3 month grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
              {MONTHS_SHORT.map((m, i) => {
                const isFuture = pickerYear === now.getFullYear() && i > now.getMonth()
                const isSelected = i === monthIndex && pickerYear === year
                return (
                  <button
                    key={m}
                    disabled={isFuture}
                    onClick={() => {
                      setMonthIndex(i)
                      setYear(pickerYear)
                      setPickerOpen(false)
                    }}
                    style={{
                      padding: '8px 4px', borderRadius: '10px', border: 'none',
                      fontSize: '12px', fontWeight: 700, cursor: isFuture ? 'default' : 'pointer',
                      background: isSelected ? '#0D307F' : (darkMode ? '#334155' : '#f1f5f9'),
                      color: isSelected ? '#fff' : isFuture ? (darkMode ? '#475569' : '#cbd5e1') : textPrimary,
                      opacity: isFuture ? 0.5 : 1,
                    }}
                  >
                    {m}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* View tabs */}
        <div style={{ display: 'flex', padding: '0 16px 12px', gap: '8px' }}>
          {(['month', 'week'] as const).map(v => (
            <button key={v} onClick={() => setView(v)} style={{
              flex: 1, padding: '8px 0', borderRadius: '10px', border: 'none',
              fontSize: '12px', fontWeight: 700, cursor: 'pointer',
              background: view === v ? '#0D307F' : (darkMode ? '#334155' : '#f1f5f9'),
              color: view === v ? '#fff' : textSecondary,
              transition: 'all 0.15s ease',
            }}>
              {v === 'month' ? 'Bulanan' : 'Minggu Ini'}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>

        {/* Total Card */}
        <div style={{ background: '#0D307F', borderRadius: '20px', padding: '20px', color: '#fff' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '1px', opacity: 0.7, marginBottom: '6px' }}>
            {view === 'week' ? 'MINGGU INI' : MONTHS_FULL[monthIndex].toUpperCase()}
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800 }}>
            {loading ? '...' : formatRp(viewTotal)}
          </div>
          {view === 'week' && !loading && (
            <div style={{ fontSize: '11px', opacity: 0.6, marginTop: '4px' }}>
              dari {formatRp(total)} bulan ini
            </div>
          )}
        </div>

        {/* Export Buttons */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={handleExportPDF} style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: '6px', padding: '11px', borderRadius: '12px',
            background: cardBg, border: `1px solid ${borderColor}`,
            fontSize: '11px', fontWeight: 700, color: '#dc2626', cursor: 'pointer',
          }}>
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            Unduh Laporan PDF
          </button>
          <button onClick={handleExportExcel} style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: '6px', padding: '11px', borderRadius: '12px',
            background: cardBg, border: `1px solid ${borderColor}`,
            fontSize: '11px', fontWeight: 700, color: '#16a34a', cursor: 'pointer',
          }}>
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            Unduh Laporan Excel
          </button>
        </div>

        {/* Category Breakdown */}
        <div style={{ background: cardBg, borderRadius: '16px', padding: '16px' }}>
          <div style={{ fontSize: '13px', fontWeight: 800, color: textPrimary, marginBottom: '14px' }}>
            Breakdown Kategori
          </div>
          {loading ? (
            <p style={{ fontSize: '12px', color: textSecondary }}>Memuat...</p>
          ) : viewByCategory.length === 0 ? (
            <p style={{ fontSize: '12px', color: textSecondary }}>Belum ada data.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {viewByCategory.map((cat, i) => (
                <div key={cat.name}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '12px', color: textSecondary }}>{categoryLabel(cat.name)}</span>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: darkMode ? '#7aa5f5' : '#0D307F' }}>
                      {formatRp(cat.amount)}
                    </span>
                  </div>
                  <div style={{ height: '4px', background: borderColor, borderRadius: '2px' }}>
                    <div style={{
                      width: `${(cat.amount / maxAmount) * 100}%`,
                      height: '100%',
                      background: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
                      borderRadius: '2px',
                      transition: 'width 0.5s ease',
                    }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Transactions list */}
        <div style={{ background: cardBg, borderRadius: '16px', padding: '16px' }}>
          <div style={{ fontSize: '13px', fontWeight: 800, color: textPrimary, marginBottom: '14px' }}>
            Transaksi
            {!loading && (
              <span style={{ fontSize: '11px', fontWeight: 600, color: textSecondary, marginLeft: '8px' }}>
                ({filteredTransactions.length})
              </span>
            )}
          </div>
          {loading ? (
            <p style={{ fontSize: '12px', color: textSecondary }}>Memuat...</p>
          ) : filteredTransactions.length === 0 ? (
            <p style={{ fontSize: '12px', color: textSecondary }}>
              {view === 'week' ? 'Tidak ada transaksi minggu ini.' : 'Belum ada transaksi.'}
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {filteredTransactions.map((tx) => (
                <div
                  key={tx.transaction_id}
                  onClick={() => router.push(`/recap/transaction/${tx.transaction_id}`)}
                  style={{
                    display: 'flex', justifyContent: 'space-between',
                    alignItems: 'center', paddingBottom: '12px',
                    borderBottom: `1px solid ${borderColor}`,
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {tx.merchant_name}
                    </div>
                    <div style={{ fontSize: '11px', color: textSecondary, marginTop: '2px' }}>
                      {formatDisplayDate(tx.transaction_date)}
                    </div>
                    <div style={{
                      display: 'inline-block', marginTop: '4px',
                      background: darkMode ? '#1e3a5f' : '#eff6ff', color: '#0D307F',
                      fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '10px',
                    }}>{categoryLabel(tx.notes)}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0, marginLeft: '8px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 800, color: darkMode ? '#7aa5f5' : '#0D307F' }}>
                      {formatRp(Number(tx.total_amount))}
                    </div>
                    <div
                      onClick={e => { e.stopPropagation(); router.push(`/recap/transaction/${tx.transaction_id}?edit=1`) }}
                      style={{
                        width: '28px', height: '28px', borderRadius: '8px',
                        background: '#eff6ff', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', cursor: 'pointer',
                      }}
                    >
                      <svg width="13" height="13" fill="none" stroke="#0D307F" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </div>
                    <div
                      onClick={e => { e.stopPropagation(); handleDelete(String(tx.transaction_id)) }}
                      style={{
                        width: '28px', height: '28px', borderRadius: '8px',
                        background: '#fef2f2', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', cursor: 'pointer',
                      }}
                    >
                      <svg width="14" height="14" fill="none" stroke="#dc2626" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
                      </svg>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}