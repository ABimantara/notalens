'use client'
import React, { useState, useEffect, use } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useNav } from '@/app/components/AppLayout'
import { useTheme } from '@/context/ThemeContext'
import { getToken } from '@/lib/auth'
import { formatRp, formatDisplayDate } from '@/lib/amount'
import { categoryLabel, CATEGORY_KEYS, CATEGORY_LABELS } from '@/lib/constants'
import type { ReceiptItem, TransactionWithItems } from '@/types'


export default function TransactionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const searchParams = useSearchParams()
  const { setActiveNav } = useNav()
  const { darkMode } = useTheme()

  const [tx, setTx] = useState<TransactionWithItems | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(searchParams.get('edit') === '1')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saveError, setSaveError] = useState('')

  const [form, setForm] = useState({
    merchant_name: '',
    transaction_date: '',
    expense_category: 'Other',
    tax_amount: '',
    total_amount: '',
  })
  const [items, setItems] = useState<ReceiptItem[]>([])
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null)
  const [imgExpanded, setImgExpanded] = useState(false)

  const bg = darkMode ? '#0f172a' : '#f4f7fb'
  const cardBg = darkMode ? '#1e293b' : '#fff'
  const textPrimary = darkMode ? '#f1f5f9' : '#0f172a'
  const textSecondary = darkMode ? '#94a3b8' : '#64748b'
  const borderColor = darkMode ? '#334155' : '#e2e8f0'

  useEffect(() => { setActiveNav('RECAP') }, [setActiveNav])

  useEffect(() => {
    const load = async () => {
      const token = getToken()
      if (!token) { setError('Silakan login ulang'); setLoading(false); return }

      try {
        const res = await fetch(`/api/transaction/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const json = await res.json()
        if (!res.ok) { setError(json.error || 'Gagal memuat transaksi'); setLoading(false); return }

        const t: TransactionWithItems = json.transaction
        setTx(t)
        setReceiptUrl(t.receipt_url ?? null)
        setForm({
          merchant_name: t.merchant_name ?? '',
          transaction_date: t.transaction_date ?? '',
          expense_category: t.notes ?? 'Other',
          tax_amount: t.tax_amount != null ? String(t.tax_amount) : '',
          total_amount: String(t.total_amount),
        })
        setItems((t.items ?? []).map(i => ({
          nama_item: i.item_name,
          qty: i.quantity ?? 1,
          harga: String(i.price),
        })))
      } catch {
        setError('Terjadi kesalahan. Coba lagi.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  const handleSave = async () => {
    setSaveError('')
    if (!form.merchant_name.trim()) { setSaveError('Nama toko wajib diisi'); return }
    if (!form.total_amount.trim()) { setSaveError('Total amount wajib diisi'); return }

    setSaving(true)
    const token = getToken()
    if (!token) { setSaveError('Silakan login ulang'); setSaving(false); return }

    try {
      const body = new FormData()
      body.append('merchant_name', form.merchant_name.trim())
      body.append('transaction_date', form.transaction_date)
      body.append('expense_category', form.expense_category)
      if (form.tax_amount) body.append('tax_amount', form.tax_amount)
      body.append('total_amount', form.total_amount)
      body.append('items', JSON.stringify(items))

      const res = await fetch(`/api/transaction/${id}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
        body,
      })
      const json = await res.json()
      if (!res.ok) { setSaveError(json.error || 'Gagal menyimpan'); return }

      setTx(json.transaction)
      setReceiptUrl(json.transaction.receipt_url ?? null)
      setEditing(false)
    } catch {
      setSaveError('Gagal menyimpan. Coba lagi.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Hapus transaksi ini? Tindakan ini tidak dapat dibatalkan.')) return
    const token = getToken()
    if (!token) return

    try {
      const res = await fetch(`/api/transaction/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) router.push('/recap')
      else {
        const json = await res.json()
        alert(json.error || 'Gagal menghapus')
      }
    } catch {
      alert('Terjadi kesalahan. Coba lagi.')
    }
  }

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', background: bg }}>
      <div style={{ width: '36px', height: '36px', borderRadius: '50%', border: '3px solid #e2e8f0', borderTopColor: '#0D307F', animation: 'spin 0.8s linear infinite' }} />
      <style jsx>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )

  if (error) return (
    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100%', background: bg, gap: '16px', padding: '24px' }}>
      <div style={{ fontSize: '13px', color: '#dc2626', textAlign: 'center' }}>{error}</div>
      <button onClick={() => router.push('/recap')} style={{ background: '#0D307F', color: '#fff', border: 'none', borderRadius: '12px', padding: '12px 24px', fontWeight: 700, cursor: 'pointer' }}>
        Kembali
      </button>
    </div>
  )

  const displayTx = tx!

  return (
    <div style={{ height: '100%', overflowY: 'auto', background: bg, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: cardBg, borderBottom: `1px solid ${borderColor}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div onClick={() => router.push('/recap')} style={{ cursor: 'pointer' }}>
            <svg width="20" height="20" fill="none" stroke="#0D307F" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </div>
          <span style={{ fontSize: '13px', fontWeight: 800, color: '#0D307F', letterSpacing: '1px' }}>
            {editing ? 'Edit Transaksi' : 'Detail Transaksi'}
          </span>
        </div>
        {!editing && (
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => setEditing(true)} style={{ background: '#eff6ff', color: '#0D307F', border: 'none', borderRadius: '10px', padding: '7px 14px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}>
              Edit
            </button>
            <button onClick={handleDelete} style={{ background: '#fef2f2', color: '#dc2626', border: 'none', borderRadius: '10px', padding: '7px 14px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}>
              Hapus
            </button>
          </div>
        )}
      </div>

      {saveError && (
        <div style={{ margin: '12px 16px 0', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '10px', padding: '10px 12px', fontSize: '11px', color: '#dc2626' }}>
          {saveError}
        </div>
      )}

      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>

        {/* ── VIEW MODE ── */}
        {!editing && (
          <>
            {/* Receipt image — collapsed by default, tap to expand */}
            {receiptUrl && (
              <div
                onClick={() => setImgExpanded(p => !p)}
                style={{ borderRadius: '16px', overflow: 'hidden', cursor: 'pointer', position: 'relative' }}
              >
                <img
                  src={receiptUrl}
                  alt="Receipt"
                  style={{
                    width: '100%', display: 'block', borderRadius: '16px',
                    height: imgExpanded ? 'auto' : '140px',
                    objectFit: imgExpanded ? 'contain' : 'cover',
                    transition: 'height 0.2s ease',
                  }}
                />
                {!imgExpanded && (
                  <div style={{
                    position: 'absolute', bottom: '10px', left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'rgba(0,0,0,0.55)', color: '#fff',
                    fontSize: '10px', fontWeight: 700, padding: '5px 12px',
                    borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '5px',
                    pointerEvents: 'none',
                  }}>
                    <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
                    </svg>
                    Tap untuk perbesar
                  </div>
                )}
              </div>
            )}

            {/* Meta fields white card */}
            <div style={{ background: cardBg, borderRadius: '14px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {[
                { label: 'Nama Toko', value: displayTx.merchant_name || '—' },
                { label: 'Tanggal', value: formatDisplayDate(displayTx.transaction_date) },
                { label: 'Kategori', value: categoryLabel(displayTx.notes) },
                ...(displayTx.tax_amount != null ? [{ label: 'Tax / PPN', value: formatRp(Number(displayTx.tax_amount)) }] : []),
                { label: 'Total', value: formatRp(Number(displayTx.total_amount)) },
                { label: 'Dicatat Pada', value: formatDisplayDate(displayTx.created_at) },
              ].map(({ label, value }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: textSecondary, textTransform: 'uppercase', letterSpacing: '0.6px' }}>{label}</span>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: textPrimary, textAlign: 'right', maxWidth: '60%' }}>{value}</span>
                </div>
              ))}
            </div>

            {/* Items */}
            {displayTx.items?.length > 0 && (
              <div style={{ background: cardBg, borderRadius: '14px', padding: '14px' }}>
                <div style={{ fontSize: '10px', fontWeight: 700, color: textSecondary, letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: '12px' }}>
                  Item ({displayTx.items.length})
                </div>
                <div style={{ display: 'flex', gap: '8px', paddingBottom: '6px', borderBottom: `1px solid ${borderColor}`, marginBottom: '8px' }}>
                  <span style={{ flex: 1, fontSize: '9px', fontWeight: 700, color: textSecondary, textTransform: 'uppercase' }}>Item</span>
                  <span style={{ width: '32px', fontSize: '9px', fontWeight: 700, color: textSecondary, textTransform: 'uppercase', textAlign: 'center' }}>Qty</span>
                  <span style={{ width: '90px', fontSize: '9px', fontWeight: 700, color: textSecondary, textTransform: 'uppercase', textAlign: 'right' }}>Harga</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {displayTx.items.map((item, i) => (
                    <div key={item.item_id ?? i} style={{ display: 'flex', gap: '8px', alignItems: 'center', paddingBottom: '10px', borderBottom: i < displayTx.items.length - 1 ? `1px solid ${borderColor}` : 'none' }}>
                      <span style={{ flex: 1, fontSize: '13px', fontWeight: 600, color: textPrimary }}>{item.item_name}</span>
                      <span style={{ width: '32px', fontSize: '12px', color: textSecondary, textAlign: 'center' }}>{item.quantity ?? 1}</span>
                      <span style={{ width: '90px', fontSize: '12px', fontWeight: 600, color: darkMode ? '#7aa5f5' : '#0D307F', textAlign: 'right' }}>{formatRp(Number(item.price))}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* ── EDIT MODE ── */}
        {editing && (
          <>
            {/* Store Name */}
            <div style={{ background: cardBg, borderRadius: '14px', padding: '14px' }}>
              <label style={{ fontSize: '10px', fontWeight: 700, color: textSecondary, letterSpacing: '0.8px', textTransform: 'uppercase' }}>Nama Toko</label>
              <input value={form.merchant_name} onChange={e => setForm(p => ({ ...p, merchant_name: e.target.value }))}
                style={{ width: '100%', boxSizing: 'border-box', border: 'none', outline: 'none', fontSize: '14px', fontWeight: 600, color: textPrimary, background: 'transparent', marginTop: '6px', padding: 0 }} />
            </div>

            {/* Date */}
            <div style={{ background: cardBg, borderRadius: '14px', padding: '14px' }}>
              <label style={{ fontSize: '10px', fontWeight: 700, color: textSecondary, letterSpacing: '0.8px', textTransform: 'uppercase' }}>Tanggal</label>
              <input type="date" value={form.transaction_date} onChange={e => setForm(p => ({ ...p, transaction_date: e.target.value }))}
                style={{ width: '100%', boxSizing: 'border-box', border: 'none', outline: 'none', fontSize: '14px', fontWeight: 600, color: textPrimary, background: 'transparent', marginTop: '6px', padding: 0 }} />
            </div>

            {/* Category */}
            <div style={{ background: cardBg, borderRadius: '14px', padding: '14px' }}>
              <label style={{ fontSize: '10px', fontWeight: 700, color: textSecondary, letterSpacing: '0.8px', textTransform: 'uppercase' }}>Kategori</label>
              <select value={form.expense_category} onChange={e => setForm(p => ({ ...p, expense_category: e.target.value }))}
                style={{ width: '100%', border: 'none', outline: 'none', fontSize: '14px', fontWeight: 600, color: textPrimary, background: 'transparent', marginTop: '6px', padding: 0, cursor: 'pointer' }}>
                {CATEGORY_KEYS.map(c => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
              </select>
            </div>

            {/* Tax */}
            <div style={{ background: cardBg, borderRadius: '14px', padding: '14px' }}>
              <label style={{ fontSize: '10px', fontWeight: 700, color: textSecondary, letterSpacing: '0.8px', textTransform: 'uppercase' }}>Tax / PPN</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px' }}>
                <span style={{ fontSize: '14px', fontWeight: 600, color: textSecondary }}>Rp</span>
                <input value={form.tax_amount} onChange={e => setForm(p => ({ ...p, tax_amount: e.target.value }))} placeholder="0 (opsional)"
                  style={{ flex: 1, border: 'none', outline: 'none', fontSize: '14px', fontWeight: 600, color: textPrimary, background: 'transparent', padding: 0 }} />
              </div>
            </div>

            {/* Total */}
            <div style={{ background: cardBg, borderRadius: '14px', padding: '14px' }}>
              <label style={{ fontSize: '10px', fontWeight: 700, color: textSecondary, letterSpacing: '0.8px', textTransform: 'uppercase' }}>Total</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px' }}>
                <span style={{ fontSize: '14px', fontWeight: 600, color: textSecondary }}>Rp</span>
                <input value={form.total_amount} onChange={e => setForm(p => ({ ...p, total_amount: e.target.value }))} placeholder="0"
                  style={{ flex: 1, border: 'none', outline: 'none', fontSize: '14px', fontWeight: 600, color: textPrimary, background: 'transparent', padding: 0 }} />
              </div>
            </div>

            {/* Items */}
            <div style={{ background: cardBg, borderRadius: '14px', padding: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <label style={{ fontSize: '10px', fontWeight: 700, color: textSecondary, letterSpacing: '0.8px', textTransform: 'uppercase' }}>Item ({items.length})</label>
                <button onClick={() => setItems(p => [...p, { nama_item: '', qty: 1, harga: '' }])}
                  style={{ background: '#eff6ff', color: '#0D307F', border: 'none', borderRadius: '8px', padding: '4px 10px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}>
                  + Tambah
                </button>
              </div>
              <div style={{ display: 'flex', gap: '8px', paddingBottom: '6px', borderBottom: `1px solid ${borderColor}`, marginBottom: '6px' }}>
                <span style={{ flex: 1, fontSize: '9px', fontWeight: 700, color: textSecondary, textTransform: 'uppercase' }}>Item</span>
                <span style={{ width: '32px', fontSize: '9px', fontWeight: 700, color: textSecondary, textTransform: 'uppercase', textAlign: 'center' }}>Qty</span>
                <span style={{ width: '80px', fontSize: '9px', fontWeight: 700, color: textSecondary, textTransform: 'uppercase', textAlign: 'right' }}>Harga</span>
                <span style={{ width: '14px' }} />
              </div>
              {items.length === 0 && (
                <p style={{ fontSize: '12px', color: textSecondary, textAlign: 'center', padding: '8px 0' }}>
                  Belum ada item. Tap + Tambah untuk menambahkan.
                </p>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {items.map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingBottom: '8px', borderBottom: i < items.length - 1 ? `1px solid ${borderColor}` : 'none' }}>
                    <input value={item.nama_item} onChange={e => setItems(p => p.map((it, idx) => idx === i ? { ...it, nama_item: e.target.value } : it))}
                      placeholder="Nama item"
                      style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: '12px', fontWeight: 600, color: textPrimary, padding: 0 }} />
                    <input type="number" min={1} value={item.qty ?? 1} onChange={e => setItems(p => p.map((it, idx) => idx === i ? { ...it, qty: Number(e.target.value) || 1 } : it))}
                      style={{ width: '32px', border: 'none', outline: 'none', background: 'transparent', fontSize: '12px', fontWeight: 600, color: textPrimary, padding: 0, textAlign: 'center' }} />
                    <input value={item.harga ?? ''} onChange={e => setItems(p => p.map((it, idx) => idx === i ? { ...it, harga: e.target.value } : it))}
                      placeholder="Harga"
                      style={{ width: '80px', border: 'none', outline: 'none', background: 'transparent', fontSize: '12px', color: textSecondary, padding: 0, textAlign: 'right' }} />
                    <div onClick={() => setItems(p => p.filter((_, idx) => idx !== i))} style={{ cursor: 'pointer', color: '#dc2626', flexShrink: 0, display: 'flex', alignItems: 'center' }}>
                      <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12" /></svg>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '4px' }}>
              <button onClick={handleSave} disabled={saving} style={{ width: '100%', background: saving ? '#6b8fd4' : '#0D307F', color: '#fff', border: 'none', borderRadius: '14px', padding: '14px', fontSize: '13px', fontWeight: 800, cursor: saving ? 'not-allowed' : 'pointer', letterSpacing: '1px' }}>
                {saving ? 'MENYIMPAN...' : 'Simpan Perubahan'}
              </button>
              <button onClick={() => { setEditing(false); setSaveError('') }} style={{ width: '100%', background: 'transparent', color: textSecondary, border: 'none', borderRadius: '14px', padding: '10px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                Batal
              </button>
            </div>
          </>
        )}

      </div>
    </div>
  )
}
