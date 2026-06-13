'use client'
import React, { useState, useEffect, use, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useTheme } from '@/context/ThemeContext'
import { getToken } from '@/lib/auth'
import { formatRp, formatDisplayDate } from '@/lib/amount'
import { categoryLabel } from '@/lib/constants'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'

interface Member {
  user_id: number
  joined_at: string
  users: { name: string; email: string; avatar_url?: string | null }
}

interface WorkspaceDetail {
  workspace_id: number
  name: string
  join_code: string
  creator_id: number
  budget: number | null
  created_at: string
  total_expenses: number
}

interface Transaction {
  transaction_id: number
  user_id: number
  merchant_name: string | null
  total_amount: number
  transaction_date: string
  notes: string | null
  receipt_url: string | null
  verified: boolean
  verified_at: string | null
  tax_amount?: number | null
  users?: { name: string } | null
  items?: { item_id?: number; item_name: string; quantity: number | null; price: number }[]
}

export default function WorkspaceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { darkMode } = useTheme()

  const [workspace, setWorkspace] = useState<WorkspaceDetail | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [shareOpen, setShareOpen] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [newName, setNewName] = useState('')
  const [saving, setSaving] = useState(false)

  const bg = darkMode ? '#0f172a' : '#f4f7fb'
  const cardBg = darkMode ? '#1e293b' : '#fff'
  const textPrimary = darkMode ? '#f1f5f9' : '#0f172a'
  const textSecondary = darkMode ? '#94a3b8' : '#64748b'
  const borderColor = darkMode ? '#334155' : '#e2e8f0'

  const currentUserId = (() => {
    if (typeof window === 'undefined') return 0
    const u = localStorage.getItem('user')
    return u ? (JSON.parse(u).user_id ?? 0) : 0
  })()

  const load = useCallback(async () => {
    const token = getToken()
    if (!token) { setError('Silakan login ulang'); setLoading(false); return }
    setLoading(true)
    try {
      const [wsRes, txRes] = await Promise.all([
        fetch(`/api/workspace/${id}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/transactions?workspace_id=${id}&limit=100`, { headers: { Authorization: `Bearer ${token}` } }),
      ])
      const wsData = await wsRes.json()
      if (!wsRes.ok) { setError(wsData.error || 'Gagal memuat workspace'); return }
      setWorkspace(wsData.workspace)
      setMembers(wsData.members ?? [])
      setNewName(wsData.workspace.name)
      if (txRes.ok) {
        const txData = await txRes.json()
        setTransactions(txData.transactions ?? [])
      } else {
        console.error('Workspace transactions error:', await txRes.text())
      }
    } catch {
      setError('Terjadi kesalahan. Coba lagi.')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { load() }, [load])

  const handleRename = async () => {
    if (!newName.trim() || newName === workspace?.name) { setEditingName(false); return }
    const token = getToken()
    if (!token) return
    setSaving(true)
    const res = await fetch(`/api/workspace/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: newName.trim() }),
    })
    const data = await res.json()
    if (res.ok) setWorkspace(p => p ? { ...p, name: data.workspace.name } : p)
    setSaving(false)
    setEditingName(false)
  }

  const handleDeleteWorkspace = async () => {
    if (!confirm('Hapus workspace ini? Semua data akan dihapus. Tindakan ini tidak dapat dibatalkan.')) return
    const token = getToken()
    if (!token) return
    const res = await fetch(`/api/workspace/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
    if (res.ok) router.push('/workspace')
    else { const d = await res.json(); alert(d.error || 'Gagal menghapus') }
  }

  const handleRemoveMember = async (userId: number, name: string) => {
    if (!confirm(`Hapus ${name} dari workspace ini?`)) return
    const token = getToken()
    if (!token) return
    const res = await fetch(`/api/workspace/${id}/members/${userId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
    if (res.ok) setMembers(p => p.filter(m => m.user_id !== userId))
    else { const d = await res.json(); alert(d.error || 'Gagal menghapus anggota') }
  }

  const handleLeaveWorkspace = async () => {
    if (!confirm('Keluar dari workspace ini?')) return
    const token = getToken()
    if (!token) return
    const res = await fetch(`/api/workspace/${id}/leave`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
    if (res.ok) router.push('/workspace')
    else { const d = await res.json(); alert(d.error || 'Gagal keluar dari workspace') }
  }

  // ── Export PDF ─────────────────────────────────────────────
  const handleExportPDF = () => {
    if (!workspace) return
    const doc = new jsPDF()
    doc.setFontSize(18); doc.setTextColor(13, 48, 127)
    doc.text('NotaLens', 14, 18)
    doc.setFontSize(11); doc.setTextColor(100, 116, 139)
    doc.text(`Workspace: ${workspace.name}`, 14, 26)
    doc.setFontSize(12); doc.setTextColor(13, 48, 127)
    doc.text(`Total Pengeluaran: ${formatRp(workspace.total_expenses)}`, 14, 34)
    autoTable(doc, {
      startY: 44,
      head: [['Toko', 'Tanggal', 'Kategori', 'Item', 'Pajak', 'Total', 'Status']],
      body: transactions.length ? transactions.map(tx => {
        const itemsText = tx.items?.length
          ? tx.items.map(it => `${it.item_name} x${it.quantity ?? 1}  ${formatRp(Number(it.price))}`).join('\n')
          : '—'
        return [
          tx.merchant_name || '—',
          formatDisplayDate(tx.transaction_date),
          categoryLabel(tx.notes),
          itemsText,
          tx.tax_amount != null ? formatRp(Number(tx.tax_amount)) : '—',
          formatRp(Number(tx.total_amount)),
          tx.verified ? 'Terverifikasi' : 'Menunggu',
        ]
      }) : [['—', '—', '—', '—', '—', '—', '—']],
      headStyles: { fillColor: [13, 48, 127], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [239, 246, 255] },
      styles: { fontSize: 9, cellPadding: 4, valign: 'top', overflow: 'linebreak' },
      columnStyles: { 3: { cellWidth: 60 }, 6: { cellWidth: 22 } },
    })
    doc.save(`${workspace.name}_Rekap.pdf`)
  }

  // ── Export Excel ───────────────────────────────────────────
  const handleExportExcel = () => {
    if (!workspace) return
    const wb = XLSX.utils.book_new()
    const ws: XLSX.WorkSheet = {}
    const merges: XLSX.Range[] = []
    const setCell = (r: number, c: number, v: string | number, bold = false) => {
      const ref = XLSX.utils.encode_cell({ r, c })
      ws[ref] = { v, t: typeof v === 'number' ? 'n' : 's', s: bold ? { font: { bold: true } } : undefined }
    }
    setCell(0, 0, `Workspace: ${workspace.name}`, true)
    setCell(1, 0, `Total Pengeluaran: ${formatRp(workspace.total_expenses)}`)
    const headerRow = 3
    const headers = ['Toko', 'Dicatat Oleh', 'Tanggal', 'Kategori', 'Nama Item', 'Qty', 'Harga Satuan (Rp)', 'Pajak (Rp)', 'Total (Rp)', 'Status']
    headers.forEach((h, c) => setCell(headerRow, c, h, true))
    let rowIdx = headerRow + 1
    for (const tx of transactions) {
      const submitter = members.find(m => m.user_id === tx.user_id)?.users?.name || '—'
      const txItems = tx.items?.length ? tx.items : null
      const rowCount = txItems ? txItems.length : 1
      const startRow = rowIdx
      if (txItems) {
        txItems.forEach((item, i) => {
          if (i === 0) {
            setCell(rowIdx, 0, tx.merchant_name || '—')
            setCell(rowIdx, 1, submitter)
            setCell(rowIdx, 2, formatDisplayDate(tx.transaction_date))
            setCell(rowIdx, 3, categoryLabel(tx.notes))
            setCell(rowIdx, 7, tx.tax_amount != null ? Number(tx.tax_amount) : '')
            setCell(rowIdx, 8, Number(tx.total_amount))
            setCell(rowIdx, 9, tx.verified ? 'Terverifikasi' : 'Menunggu')
          }
          setCell(rowIdx, 4, item.item_name)
          setCell(rowIdx, 5, item.quantity ?? 1)
          setCell(rowIdx, 6, Number(item.price))
          rowIdx++
        })
      } else {
        setCell(rowIdx, 0, tx.merchant_name || '—')
        setCell(rowIdx, 1, submitter)
        setCell(rowIdx, 2, formatDisplayDate(tx.transaction_date))
        setCell(rowIdx, 3, categoryLabel(tx.notes))
        setCell(rowIdx, 4, '—'); setCell(rowIdx, 5, ''); setCell(rowIdx, 6, '')
        setCell(rowIdx, 7, tx.tax_amount != null ? Number(tx.tax_amount) : '')
        setCell(rowIdx, 8, Number(tx.total_amount))
        setCell(rowIdx, 9, tx.verified ? 'Terverifikasi' : 'Menunggu')
        rowIdx++
      }
      if (rowCount > 1) {
        for (const col of [0, 1, 2, 3, 7, 8, 9]) {
          merges.push({ s: { r: startRow, c: col }, e: { r: startRow + rowCount - 1, c: col } })
        }
      }
    }
    rowIdx++
    setCell(rowIdx, 8, `TOTAL: ${formatRp(workspace.total_expenses)}`, true)
    ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: rowIdx, c: 9 } })
    ws['!merges'] = merges
    ws['!cols'] = [{ wch: 22 }, { wch: 16 }, { wch: 14 }, { wch: 18 }, { wch: 28 }, { wch: 6 }, { wch: 16 }, { wch: 12 }, { wch: 16 }, { wch: 16 }]
    XLSX.utils.book_append_sheet(wb, ws, 'Rekap')
    XLSX.writeFile(wb, `${workspace.name}_Rekap.xlsx`)
  }

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', background: bg }}>
      <div style={{ width: '36px', height: '36px', borderRadius: '50%', border: '3px solid #e2e8f0', borderTopColor: '#0D307F', animation: 'spin 0.8s linear infinite' }} />
      <style jsx>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
  if (error || !workspace) return (
    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100%', gap: '16px', padding: '24px', background: bg }}>
      <div style={{ fontSize: '13px', color: '#dc2626', textAlign: 'center' }}>{error || 'Workspace tidak ditemukan'}</div>
      <button onClick={() => router.push('/workspace')} style={{ background: '#0D307F', color: '#fff', border: 'none', borderRadius: '12px', padding: '12px 24px', fontWeight: 700, cursor: 'pointer' }}>Kembali</button>
    </div>
  )

  const isCreator = workspace.creator_id === currentUserId
  const budgetPercent = workspace.budget ? Math.min((workspace.total_expenses / workspace.budget) * 100, 100) : null
  const shareLink = typeof window !== 'undefined' ? `${window.location.origin}/workspace/join` : ''
  const pendingCount = transactions.filter(t => !t.verified).length
  const verifiedCount = transactions.filter(t => t.verified).length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: 'calc(100vh - 140px)', overflowY: 'auto', paddingRight: '2px', boxSizing: 'border-box', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '4px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
          <button onClick={() => router.push('/workspace')} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0D307F" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          {editingName ? (
            <div style={{ display: 'flex', gap: '6px', flex: 1 }}>
              <input value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') setEditingName(false) }} autoFocus
                style={{ flex: 1, fontSize: '16px', fontWeight: 700, color: textPrimary, background: cardBg, border: `1px solid ${borderColor}`, borderRadius: '8px', padding: '4px 10px', outline: 'none' }} />
              <button onClick={handleRename} disabled={saving} style={{ background: '#0D307F', color: '#fff', border: 'none', borderRadius: '8px', padding: '4px 12px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>{saving ? '...' : 'Simpan'}</button>
              <button onClick={() => setEditingName(false)} style={{ background: cardBg, color: textSecondary, border: `1px solid ${borderColor}`, borderRadius: '8px', padding: '4px 10px', fontSize: '12px', cursor: 'pointer' }}>Batal</button>
            </div>
          ) : (
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0D307F', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{workspace.name}</h2>
          )}
        </div>
        {isCreator && !editingName && (
          <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
            <button onClick={() => setEditingName(true)} style={{ background: darkMode ? '#334155' : '#f1f5f9', border: 'none', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 600, color: textSecondary }}>Edit</button>
            <button onClick={handleDeleteWorkspace} style={{ background: '#fef2f2', border: 'none', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 600, color: '#dc2626' }}>Hapus</button>
          </div>
        )}
      </div>

      {/* Budget / Expenses card */}
      <div style={{ background: 'linear-gradient(135deg, #0D307F 0%, #061b4a 100%)', borderRadius: '16px', padding: '20px', color: '#fff', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ fontSize: '10px', fontWeight: 600, color: '#9bc2ff', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Total Pengeluaran Workspace</div>
        <div style={{ fontSize: '30px', fontWeight: 800, letterSpacing: '-0.5px' }}>{formatRp(workspace.total_expenses)}</div>
        {budgetPercent !== null && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#cbdfff', marginBottom: '6px' }}>
              <span>Budget Terpakai</span>
              <span>{budgetPercent.toFixed(0)}% dari {formatRp(workspace.budget!)}</span>
            </div>
            <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.2)', borderRadius: '10px', overflow: 'hidden' }}>
              <div style={{ width: `${budgetPercent}%`, height: '100%', background: budgetPercent > 80 ? '#f87171' : '#9bc2ff', borderRadius: '10px', transition: 'width 0.5s' }} />
            </div>
          </div>
        )}
        <div style={{ display: 'flex', gap: '16px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '10px', fontSize: '11px', color: '#cbdfff' }}>
          <span>{members.length} anggota</span>
          <span>{verifiedCount} terverifikasi</span>
          {pendingCount > 0 && <span style={{ color: '#fde68a' }}>{pendingCount} menunggu</span>}
          <span>Kode: <strong style={{ color: '#fff', letterSpacing: '2px' }}>{workspace.join_code}</strong></span>
        </div>
      </div>

      {/* Action buttons */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        <button onClick={() => { sessionStorage.setItem('scanWorkspaceId', String(workspace.workspace_id)); router.push('/scan') }}
          style={{ background: '#0D307F', color: '#fff', border: 'none', height: '46px', borderRadius: '10px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><path d="M3 7V5a2 2 0 012-2h2m10 0h2a2 2 0 012 2v2m0 10v2a2 2 0 01-2 2h-2M7 21H5a2 2 0 01-2-2v-2"/><rect x="7" y="7" width="3" height="3" fill="#fff"/><rect x="14" y="7" width="3" height="3" fill="#fff"/><rect x="7" y="14" width="3" height="3" fill="#fff"/><rect x="14" y="14" width="3" height="3" fill="#fff"/></svg>
          Scan Struk
        </button>
        <button onClick={() => setShareOpen(true)} style={{ background: cardBg, color: textPrimary, border: `1px solid ${borderColor}`, height: '46px', borderRadius: '10px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
          <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
          Bagikan
        </button>
      </div>

      {/* Export buttons — creator only */}
      {isCreator && (
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={handleExportPDF} style={{ flex: 1, background: cardBg, color: '#dc2626', border: `1px solid ${borderColor}`, padding: '11px', borderRadius: '10px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
            <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            Export PDF
          </button>
          <button onClick={handleExportExcel} style={{ flex: 1, background: cardBg, color: '#16a34a', border: `1px solid ${borderColor}`, padding: '11px', borderRadius: '10px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
            <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            Export Excel
          </button>
        </div>
      )}

      {/* Members */}
      <div style={{ background: cardBg, borderRadius: '14px', padding: '14px' }}>
        <div style={{ fontSize: '10px', fontWeight: 700, color: textSecondary, letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: '12px' }}>Anggota ({members.length})</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {members.map((m, i) => (
            <div key={m.user_id} style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingBottom: i < members.length - 1 ? '10px' : 0, borderBottom: i < members.length - 1 ? `1px solid ${borderColor}` : 'none' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#0D307F', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {m.users?.avatar_url
                  ? <img src={m.users.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <span style={{ fontSize: '13px', fontWeight: 800, color: '#fff' }}>{m.users?.name?.charAt(0)?.toUpperCase() || '?'}</span>
                }
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: textPrimary }}>{m.users?.name || '—'}</div>
                <div style={{ fontSize: '11px', color: textSecondary }}>{m.users?.email}</div>
              </div>
              {m.user_id === workspace.creator_id
                ? <span style={{ fontSize: '10px', fontWeight: 700, background: '#eff6ff', color: '#0D307F', padding: '2px 8px', borderRadius: '10px', flexShrink: 0 }}>Creator</span>
                : isCreator
                  ? (
                    <button onClick={() => handleRemoveMember(m.user_id, m.users?.name || 'anggota')}
                      style={{ background: '#fef2f2', color: '#dc2626', border: 'none', borderRadius: '8px', padding: '4px 10px', fontSize: '11px', fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>
                      Hapus
                    </button>
                  )
                  : m.user_id === currentUserId
                    ? (
                      <button onClick={handleLeaveWorkspace}
                        style={{ background: darkMode ? '#334155' : '#f1f5f9', color: '#dc2626', border: 'none', borderRadius: '8px', padding: '4px 10px', fontSize: '11px', fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>
                        Keluar
                      </button>
                    )
                    : null
              }
            </div>
          ))}
        </div>
      </div>

      {/* Transactions */}
      <div style={{ background: cardBg, borderRadius: '14px', padding: '14px' }}>
        <div style={{ fontSize: '10px', fontWeight: 700, color: textSecondary, letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: '12px' }}>
          Semua Transaksi ({transactions.length})
        </div>
        {transactions.length === 0 ? (
          <p style={{ fontSize: '12px', color: textSecondary, textAlign: 'center', padding: '8px 0' }}>Belum ada transaksi. Scan struk untuk mulai.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {transactions.map((tx, i) => (
              <div
                key={tx.transaction_id}
                onClick={() => router.push(`/workspace/${id}/transaction/${tx.transaction_id}`)}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: i < transactions.length - 1 ? '10px' : 0, borderBottom: i < transactions.length - 1 ? `1px solid ${borderColor}` : 'none', cursor: 'pointer' }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tx.merchant_name || '—'}</div>
                    {/* Verification badge */}
                    {tx.verified === true ? (
                      <span style={{ fontSize: '9px', fontWeight: 700, background: '#dcfce7', color: '#16a34a', padding: '1px 7px', borderRadius: '20px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <svg width="8" height="8" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
                        Verified
                      </span>
                    ) : (
                      <span style={{ fontSize: '9px', fontWeight: 700, background: '#fef9c3', color: '#b45309', padding: '1px 7px', borderRadius: '20px', flexShrink: 0 }}>
                        Menunggu
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '11px', color: textSecondary }}>
                    {formatDisplayDate(tx.transaction_date)} · {members.find(m => m.user_id === tx.user_id)?.users?.name || '—'}
                  </div>
                  <div style={{ display: 'inline-block', marginTop: '3px', background: darkMode ? '#1e3a5f' : '#eff6ff', color: '#0D307F', fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '10px' }}>
                    {categoryLabel(tx.notes)}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0, marginLeft: '8px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: darkMode ? '#7aa5f5' : '#0D307F' }}>{formatRp(Number(tx.total_amount))}</div>
                  <svg width="14" height="14" fill="none" stroke={textSecondary} strokeWidth="2" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6"/></svg>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Share modal */}
      {shareOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}>
          <div style={{ background: cardBg, borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '340px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ textAlign: 'center' }}>
              <h4 style={{ fontSize: '16px', fontWeight: 800, color: textPrimary, margin: 0 }}>Bagikan Workspace</h4>
              <p style={{ fontSize: '12px', color: textSecondary, marginTop: '6px', lineHeight: '1.4' }}>Bagikan kode ini ke anggota tim kamu.</p>
            </div>
            <div style={{ background: darkMode ? '#0f172a' : '#f8fafc', border: '2px dashed #0D307F', borderRadius: '12px', padding: '16px', textAlign: 'center', fontSize: '28px', fontWeight: 800, color: '#0D307F', letterSpacing: '4px' }}>
              {workspace.join_code}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '10px', fontWeight: 700, color: textSecondary, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Link Bergabung</span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input readOnly value={`${shareLink}?code=${workspace.join_code}`} style={{ flex: 1, height: '36px', padding: '0 10px', borderRadius: '8px', border: `1px solid ${borderColor}`, background: darkMode ? '#0f172a' : '#f1f5f9', fontSize: '11px', color: textSecondary, outline: 'none' }} />
                <button onClick={() => { navigator.clipboard.writeText(`${shareLink}?code=${workspace.join_code}`); alert('Link disalin!') }} style={{ height: '36px', padding: '0 12px', borderRadius: '8px', border: 'none', background: '#0D307F', color: '#fff', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>Salin</button>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <button onClick={() => setShareOpen(false)} style={{ height: '40px', borderRadius: '10px', border: `1px solid ${borderColor}`, background: cardBg, fontSize: '13px', fontWeight: 700, color: textSecondary, cursor: 'pointer' }}>Tutup</button>
              <button onClick={() => { navigator.clipboard.writeText(workspace.join_code); alert('Kode disalin! 📋') }} style={{ height: '40px', borderRadius: '10px', border: 'none', background: '#0D307F', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>Salin Kode</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
