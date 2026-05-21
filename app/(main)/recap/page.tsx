'use client'
<<<<<<< HEAD
import { useEffect } from 'react'
import { useNav } from '@/app/components/AppLayout'

export default function RecapPage() {
  const { setActiveNav } = useNav()
  useEffect(() => { setActiveNav('RECAP') }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '12px' }}>
      <div style={{ fontSize: '40px' }}>📄</div>
      <p style={{ fontSize: '16px', fontWeight: 800, color: '#0a1a3a', margin: 0 }}>Recap</p>
      <p style={{ fontSize: '12px', color: '#7a90b0', margin: 0 }}>Coming soon</p>
=======
import React, { useState } from 'react'
import { useNav } from '@/app/components/AppLayout'
import { useTheme } from '@/context/ThemeContext'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December']

const dummyCategories = [
  { name: 'Groceries', amount: 450000, color: '#0D307F' },
  { name: 'Food & Beverage', amount: 320000, color: '#1e4bb8' },
  { name: 'Transportation', amount: 180000, color: '#2d5fd4' },
  { name: 'Shopping', amount: 200000, color: '#4a7feb' },
  { name: 'Health', amount: 95000, color: '#7aa5f5' },
]

const dummyTransactions = [
  { id: 1, store: 'Supermart Indo', date: '14 May 2026', category: 'Groceries', amount: -64500 },
  { id: 2, store: 'Grab Food', date: '13 May 2026', category: 'Food & Beverage', amount: -45000 },
  { id: 3, store: 'Indomaret', date: '12 May 2026', category: 'Groceries', amount: -32000 },
  { id: 4, store: 'KRL Commuter', date: '11 May 2026', category: 'Transportation', amount: -15000 },
  { id: 5, store: 'Shopee', date: '10 May 2026', category: 'Shopping', amount: -120000 },
]

const formatRp = (n: number) => 'Rp ' + Math.abs(n).toLocaleString('id-ID')
const total = dummyCategories.reduce((s, c) => s + c.amount, 0)
const maxAmount = Math.max(...dummyCategories.map(c => c.amount))

export default function RecapPage() {
  const { setActiveNav } = useNav()
  const { darkMode } = useTheme()
  const [monthIndex, setMonthIndex] = useState(4)
  const [year] = useState(2026)
  const [filter, setFilter] = useState<'All' | 'This Week' | 'This Month'>('This Month')

  React.useEffect(() => { setActiveNav('RECAP') }, [setActiveNav])

  const bg = darkMode ? '#0f172a' : '#f4f7fb'
  const cardBg = darkMode ? '#1e293b' : '#fff'
  const textPrimary = darkMode ? '#f1f5f9' : '#0f172a'
  const textSecondary = darkMode ? '#94a3b8' : '#64748b'
  const borderColor = darkMode ? '#334155' : '#e2e8f0'

  const handleExportPDF = () => {
    const doc = new jsPDF()

    doc.setFontSize(18)
    doc.setTextColor(13, 48, 127)
    doc.text('NotaLens', 14, 18)

    doc.setFontSize(11)
    doc.setTextColor(100, 116, 139)
    doc.text('Rekap Pengeluaran Pribadi', 14, 26)
    doc.text(`${MONTHS[monthIndex]} ${year}`, 14, 33)

    doc.setFontSize(12)
    doc.setTextColor(13, 48, 127)
    doc.text(`Total: ${formatRp(total)}`, 14, 42)

    autoTable(doc, {
      startY: 50,
      head: [['Toko', 'Tanggal', 'Kategori', 'Jumlah']],
      body: dummyTransactions.map(tx => [
        tx.store,
        tx.date,
        tx.category,
        formatRp(tx.amount),
      ]),
      headStyles: {
        fillColor: [13, 48, 127],
        textColor: 255,
        fontStyle: 'bold',
      },
      alternateRowStyles: { fillColor: [239, 246, 255] },
      styles: { fontSize: 10, cellPadding: 6 },
    })

    doc.save(`NotaLens_${MONTHS[monthIndex]}_${year}.pdf`)
  }

  const handleExportExcel = () => {
    const wsData = [
      ['NotaLens - Rekap Pengeluaran Pribadi'],
      [`Periode: ${MONTHS[monthIndex]} ${year}`],
      [`Total Pengeluaran: ${formatRp(total)}`],
      [],
      ['Toko', 'Tanggal', 'Kategori', 'Jumlah'],
      ...dummyTransactions.map(tx => [
        tx.store,
        tx.date,
        tx.category,
        formatRp(tx.amount),
      ]),
      [],
      ['', '', 'TOTAL', formatRp(total)],
    ]

    const ws = XLSX.utils.aoa_to_sheet(wsData)
    ws['!cols'] = [{ wch: 20 }, { wch: 15 }, { wch: 18 }, { wch: 15 }]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Rekap')
    XLSX.writeFile(wb, `NotaLens_${MONTHS[monthIndex]}_${year}.xlsx`)
  }

  return (
    <div style={{
      height: '100%', overflowY: 'auto', background: bg,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      transition: 'background 0.3s',
    }}>

      {/* Month Selector */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '16px', background: cardBg, borderBottom: `1px solid ${borderColor}`,
      }}>
        <div onClick={() => setMonthIndex(p => Math.max(0, p - 1))}
          style={{ cursor: 'pointer', padding: '4px 10px', fontSize: '18px', color: '#0D307F' }}>‹</div>
        <span style={{ fontSize: '14px', fontWeight: 700, color: textPrimary }}>
          {MONTHS[monthIndex]} {year}
        </span>
        <div onClick={() => setMonthIndex(p => Math.min(11, p + 1))}
          style={{ cursor: 'pointer', padding: '4px 10px', fontSize: '18px', color: '#0D307F' }}>›</div>
      </div>

      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>

        {/* Total Card */}
        <div style={{ background: '#0D307F', borderRadius: '20px', padding: '20px', color: '#fff' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '1px', opacity: 0.7, marginBottom: '8px' }}>
            TOTAL PENGELUARAN
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, marginBottom: '12px' }}>
            {formatRp(total)}
          </div>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '4px',
            background: 'rgba(255,255,255,0.15)', borderRadius: '20px',
            padding: '4px 10px', fontSize: '11px', fontWeight: 600,
          }}>
            ↓ 12% from last month
          </div>
        </div>

        {/* Filter */}
        <div style={{ display: 'flex', gap: '8px' }}>
          {(['All', 'This Week', 'This Month'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding: '7px 14px', borderRadius: '20px', border: 'none',
              fontSize: '11px', fontWeight: 700, cursor: 'pointer',
              background: filter === f ? '#0D307F' : cardBg,
              color: filter === f ? '#fff' : textSecondary,
            }}>{f}</button>
          ))}
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
              <line x1="12" y1="18" x2="12" y2="12" />
              <line x1="9" y1="15" x2="15" y2="15" />
            </svg>
            Export PDF
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
              <line x1="12" y1="18" x2="12" y2="12" />
              <line x1="9" y1="15" x2="15" y2="15" />
            </svg>
            Export Excel
          </button>
        </div>

        {/* Category Breakdown */}
        <div style={{ background: cardBg, borderRadius: '16px', padding: '16px' }}>
          <div style={{ fontSize: '13px', fontWeight: 800, color: textPrimary, marginBottom: '14px' }}>
            Category Breakdown
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {dummyCategories.map(cat => (
              <div key={cat.name}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontSize: '12px', color: textSecondary }}>{cat.name}</span>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#0D307F' }}>{formatRp(cat.amount)}</span>
                </div>
                <div style={{ height: '4px', background: borderColor, borderRadius: '2px' }}>
                  <div style={{
                    width: `${(cat.amount / maxAmount) * 100}%`,
                    height: '100%', background: cat.color, borderRadius: '2px',
                    transition: 'width 0.5s ease',
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Transactions */}
        <div style={{ background: cardBg, borderRadius: '16px', padding: '16px' }}>
          <div style={{ fontSize: '13px', fontWeight: 800, color: textPrimary, marginBottom: '14px' }}>
            Recent Transactions
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {dummyTransactions.map(tx => (
              <div key={tx.id} style={{
                display: 'flex', justifyContent: 'space-between',
                alignItems: 'center', paddingBottom: '12px',
                borderBottom: `1px solid ${borderColor}`,
              }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: textPrimary }}>{tx.store}</div>
                  <div style={{ fontSize: '11px', color: textSecondary, marginTop: '2px' }}>{tx.date}</div>
                  <div style={{
                    display: 'inline-block', marginTop: '4px',
                    background: darkMode ? '#1e3a5f' : '#eff6ff', color: '#0D307F',
                    fontSize: '10px', fontWeight: 700, padding: '2px 8px',
                    borderRadius: '10px',
                  }}>{tx.category}</div>
                </div>
                <div style={{ fontSize: '13px', fontWeight: 800, color: '#0D307F' }}>
                  {formatRp(tx.amount)}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
>>>>>>> main
    </div>
  )
}