'use client'
import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useNav } from '@/app/components/AppLayout'
import { useTheme } from '@/context/ThemeContext'
import { getToken } from '@/lib/auth'
import {
  dataUrlToFile,
  mapReceiptToForm,
  estimateConfidence,
} from '@/lib/scan'
import { saveTransaction } from '@/lib/transactions-api'
import { CATEGORY_KEYS, CATEGORY_LABELS } from '@/lib/constants'
import type { ReceiptItem } from '@/types'

interface WorkspaceOption {
  workspace_id: number
  name: string
}

const VerifyScanPage = () => {
  const router = useRouter()
  const { setActiveNav } = useNav()
  const { darkMode } = useTheme()

  const [image, setImage] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [expanded, setExpanded] = useState(false)
  const [confidence, setConfidence] = useState(0)
  const [items, setItems] = useState<ReceiptItem[]>([])
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  // Destination: null = personal, number = workspace_id
  const [scanWorkspaceId, setScanWorkspaceId] = useState<number | null>(null)
  const [isLockedWorkspace, setIsLockedWorkspace] = useState(false)
  const [selectedDest, setSelectedDest] = useState<number | null>(null) // null = personal
  const [workspaceOptions, setWorkspaceOptions] = useState<WorkspaceOption[]>([])

  const bg = darkMode ? '#0f172a' : '#f4f7fb'
  const cardBg = darkMode ? '#1e293b' : '#fff'
  const textPrimary = darkMode ? '#f1f5f9' : '#0f172a'
  const textSecondary = darkMode ? '#94a3b8' : '#94a3b8'
  const borderColor = darkMode ? '#334155' : '#e2e8f0'

  const [formData, setFormData] = useState({
    storeName: '',
    date: '',
    category: 'Groceries',
    taxAmount: '',
    totalAmount: '',
  })

  const categories = CATEGORY_KEYS

  useEffect(() => {
    setActiveNav('SCAN')

    // Check if scan was triggered from a workspace
    const wsIdRaw = sessionStorage.getItem('scanWorkspaceId')
    if (wsIdRaw) {
      const wsId = Number(wsIdRaw)
      setScanWorkspaceId(wsId)
      setSelectedDest(wsId)
      setIsLockedWorkspace(true)
    } else {
      // Personal scan — fetch user's workspaces to offer as save destination
      const token = getToken()
      if (token) {
        fetch('/api/workspace', { headers: { Authorization: `Bearer ${token}` } })
          .then(r => r.ok ? r.json() : null)
          .then(data => {
            if (data) {
              const all: WorkspaceOption[] = [
                ...(data.owned ?? []).map((w: WorkspaceOption) => ({ workspace_id: w.workspace_id, name: w.name })),
                ...(data.joined ?? []).map((w: WorkspaceOption) => ({ workspace_id: w.workspace_id, name: w.name })),
              ]
              setWorkspaceOptions(all)
            }
          })
          .catch(() => {})
      }
    }

    const runExtraction = async () => {
      const img = sessionStorage.getItem('scannedImage')
      if (!img) {
        setError('Gambar tidak ditemukan. Ambil foto ulang.')
        setLoading(false)
        return
      }
      setImage(img)

      const token = getToken()
      if (!token) {
        setError('Silakan login terlebih dahulu.')
        setLoading(false)
        return
      }

      try {
        const file = await dataUrlToFile(img)
        const body = new FormData()
        body.append('file', file)

        const res = await fetch('/api/upload', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body,
        })

        const json = await res.json()
        if (!res.ok) {
          if (res.status === 401) {
            setError('Sesi habis. Silakan logout, login ulang, lalu scan lagi.')
          } else {
            setError(json.error || 'Gagal memproses struk')
          }
          return
        }

        const mapped = mapReceiptToForm(json.data)
        setFormData(prev => ({
          ...prev,
          storeName: mapped.storeName,
          date: mapped.date,
          category: mapped.category,
          taxAmount: mapped.taxAmount,
          totalAmount: mapped.totalAmount,
        }))
        setItems(mapped.items)
        setConfidence(estimateConfidence(json.data))
      } catch {
        setError('Tidak dapat terhubung ke server AI. Pastikan FastAPI berjalan di port 8000.')
      } finally {
        setLoading(false)
      }
    }

    runExtraction()
  }, [setActiveNav])

  const handleSave = async () => {
    setSaveError('')
    if (!formData.storeName.trim()) {
      setSaveError('Nama toko wajib diisi')
      return
    }
    if (!formData.totalAmount.trim()) {
      setSaveError('Total amount wajib diisi')
      return
    }

    setSaving(true)
    try {
      let receiptFile: File | null = null
      if (image) {
        receiptFile = await dataUrlToFile(image)
      }

      const result = await saveTransaction({
        merchant_name: formData.storeName.trim(),
        transaction_date: formData.date,
        expense_category: formData.category,
        tax_amount: formData.taxAmount,
        total_amount: formData.totalAmount,
        items,
        receipt: receiptFile,
        workspace_id: selectedDest ?? null,
      })

      if (!result.ok) {
        setSaveError(result.error)
        return
      }

      sessionStorage.removeItem('scannedImage')
      sessionStorage.removeItem('scanWorkspaceId')

      if (selectedDest) {
        router.push(`/workspace/${selectedDest}`)
      } else {
        router.push('/dashboard')
      }
    } catch {
      setSaveError('Gagal menyimpan. Coba lagi.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <div style={{
      display: 'flex', flexDirection: 'column', justifyContent: 'center',
      alignItems: 'center', height: '100%', background: bg, gap: '12px',
    }}>
      <div style={{
        width: '40px', height: '40px', borderRadius: '50%',
        border: '3px solid #e2e8f0', borderTopColor: '#0D307F',
        animation: 'spin 0.8s linear infinite',
      }} />
      <div style={{ color: '#0D307F', fontSize: '13px', fontWeight: 600 }}>
        Memproses struk dengan AI...
      </div>
      <style jsx>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )

  if (error && !image) return (
    <div style={{
      display: 'flex', flexDirection: 'column', justifyContent: 'center',
      alignItems: 'center', height: '100%', background: bg, padding: '24px', gap: '16px',
    }}>
      <div style={{ fontSize: '13px', color: '#dc2626', textAlign: 'center' }}>{error}</div>
      <button onClick={() => router.push('/scan')} style={{
        background: '#0D307F', color: '#fff', border: 'none',
        borderRadius: '12px', padding: '12px 24px', fontWeight: 700, cursor: 'pointer',
      }}>
        Kembali ke Scan
      </button>
    </div>
  )

  const selectedWorkspaceName = workspaceOptions.find(w => w.workspace_id === selectedDest)?.name

  return (
    <div style={{
      height: '100%', overflowY: 'auto', background: bg,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      transition: 'background 0.3s',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '12px',
        padding: '16px', background: cardBg, borderBottom: `1px solid ${borderColor}`,
      }}>
        <div onClick={() => {
          router.push(scanWorkspaceId ? `/workspace/${scanWorkspaceId}` : '/scan')
        }} style={{ cursor: 'pointer' }}>
          <svg width="20" height="20" fill="none" stroke="#0D307F" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </div>
        <span style={{ fontSize: '13px', fontWeight: 800, color: '#0D307F', letterSpacing: '1px' }}>
          NotaLens
        </span>
        {isLockedWorkspace && (
          <span style={{ marginLeft: 'auto', fontSize: '10px', fontWeight: 700, background: '#eff6ff', color: '#0D307F', padding: '3px 10px', borderRadius: '20px' }}>
            Workspace
          </span>
        )}
      </div>

      {/* Scanned image preview */}
      {image && (
        <div style={{ position: 'relative', margin: '16px', borderRadius: '16px', overflow: 'hidden' }}>
          <img src={image} alt="Scanned receipt" style={{
            width: '100%', height: expanded ? 'auto' : '160px',
            objectFit: 'cover', borderRadius: '16px',
          }} />
          <div onClick={() => setExpanded(p => !p)} style={{
            position: 'absolute', bottom: '10px', left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(0,0,0,0.6)', color: '#fff',
            fontSize: '11px', fontWeight: 700, padding: '6px 14px',
            borderRadius: '20px', cursor: 'pointer', display: 'flex',
            alignItems: 'center', gap: '6px',
          }}>
            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
            </svg>
            {expanded ? 'Tutup' : 'Perbesar'}
          </div>
        </div>
      )}

      {(error || saveError) && (
        <div style={{
          margin: '0 16px 12px', background: '#fef2f2', border: '1px solid #fca5a5',
          borderRadius: '10px', padding: '10px 12px', fontSize: '11px', color: '#dc2626',
        }}>
          {saveError || error}
        </div>
      )}

      {/* AI Confidence */}
      <div style={{ margin: '0 16px 16px', background: cardBg, borderRadius: '16px', padding: '14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{ fontSize: '11px', fontWeight: 800, color: '#0D307F', letterSpacing: '1px' }}>AI CONFIDENCE</span>
          <span style={{ fontSize: '13px', fontWeight: 800, color: '#0D307F' }}>{confidence}% Akurasi</span>
        </div>
        <div style={{ height: '4px', background: borderColor, borderRadius: '2px' }}>
          <div style={{ width: `${confidence}%`, height: '100%', background: '#0D307F', borderRadius: '2px' }} />
        </div>
      </div>

      {/* Title */}
      <div style={{ padding: '0 16px 12px' }}>
        <div style={{ fontSize: '18px', fontWeight: 800, color: textPrimary }}>Verifikasi Scan</div>
        <div style={{ fontSize: '11px', color: textSecondary, marginTop: '4px' }}>
          Periksa dan sesuaikan detail yang diekstrak di bawah ini untuk memastikan pencatatan yang akurat.
        </div>
      </div>

      {/* Form */}
      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>

        {/* Save destination — only shown for personal scans with workspaces available */}
        {!isLockedWorkspace && workspaceOptions.length > 0 && (
          <div style={{ background: cardBg, borderRadius: '14px', padding: '14px' }}>
            <label style={{ fontSize: '10px', fontWeight: 700, color: textSecondary, letterSpacing: '0.8px', textTransform: 'uppercase' }}>
              Simpan ke
            </label>
            <select
              value={selectedDest === null ? 'personal' : String(selectedDest)}
              onChange={e => setSelectedDest(e.target.value === 'personal' ? null : Number(e.target.value))}
              style={{
                width: '100%', border: 'none', outline: 'none',
                fontSize: '14px', fontWeight: 600, color: textPrimary,
                background: 'transparent', marginTop: '6px', padding: 0, cursor: 'pointer',
              }}
            >
              <option value="personal">Pengeluaran Pribadi</option>
              {workspaceOptions.map(ws => (
                <option key={ws.workspace_id} value={String(ws.workspace_id)}>{ws.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Store Name */}
        <div style={{ background: cardBg, borderRadius: '14px', padding: '14px' }}>
          <label style={{ fontSize: '10px', fontWeight: 700, color: textSecondary, letterSpacing: '0.8px', textTransform: 'uppercase' }}>
            Nama Toko
          </label>
          <input value={formData.storeName} onChange={e => setFormData(p => ({ ...p, storeName: e.target.value }))}
            placeholder="Nama toko"
            style={{ width: '100%', boxSizing: 'border-box', border: 'none', outline: 'none',
              fontSize: '14px', fontWeight: 600, color: textPrimary, background: 'transparent', marginTop: '6px', padding: 0 }} />
        </div>

        {/* Date */}
        <div style={{ background: cardBg, borderRadius: '14px', padding: '14px' }}>
          <label style={{ fontSize: '10px', fontWeight: 700, color: textSecondary, letterSpacing: '0.8px', textTransform: 'uppercase' }}>
            Tanggal
          </label>
          <input
            type="date"
            value={formData.date}
            onChange={e => setFormData(p => ({ ...p, date: e.target.value }))}
            style={{ width: '100%', boxSizing: 'border-box', border: 'none', outline: 'none',
              fontSize: '14px', fontWeight: 600, color: textPrimary, background: 'transparent', marginTop: '6px', padding: 0 }} />
        </div>

        {/* Category */}
        <div style={{ background: cardBg, borderRadius: '14px', padding: '14px' }}>
          <label style={{ fontSize: '10px', fontWeight: 700, color: textSecondary, letterSpacing: '0.8px', textTransform: 'uppercase' }}>
            Kategori
          </label>
          <select value={formData.category} onChange={e => setFormData(p => ({ ...p, category: e.target.value }))}
            style={{ width: '100%', border: 'none', outline: 'none',
              fontSize: '14px', fontWeight: 600, color: textPrimary,
              background: 'transparent', marginTop: '6px', padding: 0, cursor: 'pointer' }}>
            {categories.map(c => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
          </select>
        </div>

        {/* Tax Amount */}
        <div style={{ background: cardBg, borderRadius: '14px', padding: '14px' }}>
          <label style={{ fontSize: '10px', fontWeight: 700, color: textSecondary, letterSpacing: '0.8px', textTransform: 'uppercase' }}>
            Tax / PPN
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px' }}>
            <span style={{ fontSize: '14px', fontWeight: 600, color: textSecondary }}>Rp</span>
            <input
              value={formData.taxAmount}
              onChange={e => setFormData(p => ({ ...p, taxAmount: e.target.value }))}
              placeholder="0 (opsional)"
              style={{ flex: 1, border: 'none', outline: 'none',
                fontSize: '14px', fontWeight: 600, color: textPrimary, background: 'transparent', padding: 0 }} />
          </div>
        </div>

        {/* Total Amount */}
        <div style={{ background: cardBg, borderRadius: '14px', padding: '14px' }}>
          <label style={{ fontSize: '10px', fontWeight: 700, color: textSecondary, letterSpacing: '0.8px', textTransform: 'uppercase' }}>
            Total
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px' }}>
            <span style={{ fontSize: '14px', fontWeight: 600, color: textSecondary }}>Rp</span>
            <input value={formData.totalAmount} onChange={e => setFormData(p => ({ ...p, totalAmount: e.target.value }))}
              placeholder="0"
              style={{ flex: 1, border: 'none', outline: 'none',
                fontSize: '14px', fontWeight: 600, color: textPrimary, background: 'transparent', padding: 0 }} />
          </div>
        </div>

      {/* Line items from AI */}
      {items.length > 0 && (
        <div style={{ background: cardBg, borderRadius: '14px', padding: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <label style={{ fontSize: '10px', fontWeight: 700, color: textSecondary, letterSpacing: '0.8px', textTransform: 'uppercase' }}>
              Items ({items.length})
            </label>
            <button onClick={() => setItems(p => [...p, { nama_item: '', qty: 1, harga: '' }])} style={{
              background: '#eff6ff', color: '#0D307F', border: 'none',
              borderRadius: '8px', padding: '4px 10px', fontSize: '11px',
              fontWeight: 700, cursor: 'pointer',
            }}>+ Tambah</button>
          </div>
          <div style={{ display: 'flex', gap: '8px', paddingBottom: '6px', borderBottom: `1px solid ${borderColor}`, marginBottom: '6px' }}>
            <span style={{ flex: 1, fontSize: '9px', fontWeight: 700, color: textSecondary, letterSpacing: '0.6px', textTransform: 'uppercase' }}>Item</span>
            <span style={{ width: '32px', fontSize: '9px', fontWeight: 700, color: textSecondary, letterSpacing: '0.6px', textTransform: 'uppercase', textAlign: 'center' }}>Qty</span>
            <span style={{ width: '80px', fontSize: '9px', fontWeight: 700, color: textSecondary, letterSpacing: '0.6px', textTransform: 'uppercase', textAlign: 'right' }}>Harga</span>
            <span style={{ width: '14px' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {items.map((item, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                paddingBottom: '8px',
                borderBottom: i < items.length - 1 ? `1px solid ${borderColor}` : 'none',
              }}>
                <input
                  value={item.nama_item}
                  onChange={e => setItems(p => p.map((it, idx) => idx === i ? { ...it, nama_item: e.target.value } : it))}
                  placeholder="Nama item"
                  style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: '12px', fontWeight: 600, color: textPrimary, padding: 0 }}
                />
                <input
                  type="number" min={1} value={item.qty ?? 1}
                  onChange={e => setItems(p => p.map((it, idx) => idx === i ? { ...it, qty: Number(e.target.value) || 1 } : it))}
                  style={{ width: '32px', border: 'none', outline: 'none', background: 'transparent', fontSize: '12px', fontWeight: 600, color: textPrimary, padding: 0, textAlign: 'center' }}
                />
                <input
                  value={item.harga ?? ''}
                  onChange={e => setItems(p => p.map((it, idx) => idx === i ? { ...it, harga: e.target.value } : it))}
                  placeholder="Harga"
                  style={{ width: '80px', border: 'none', outline: 'none', background: 'transparent', fontSize: '12px', color: textSecondary, padding: 0, textAlign: 'right' }}
                />
                <div onClick={() => setItems(p => p.filter((_, idx) => idx !== i))} style={{ cursor: 'pointer', color: '#dc2626', flexShrink: 0, display: 'flex', alignItems: 'center' }}>
                  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12" /></svg>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      </div>

      {/* Buttons */}
      <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <button onClick={handleSave} disabled={saving} style={{
          width: '100%', background: saving ? '#6b8fd4' : '#0D307F', color: '#fff',
          border: 'none', borderRadius: '14px', padding: '14px',
          fontSize: '13px', fontWeight: 800, cursor: saving ? 'not-allowed' : 'pointer', letterSpacing: '1px',
        }}>
          {saving ? 'MENYIMPAN...' : selectedDest
            ? `Simpan ke ${selectedWorkspaceName}`
            : 'Konfirmasi & Simpan'}
        </button>
        <button onClick={() => router.push('/scan')} style={{
          width: '100%', background: 'transparent', color: textSecondary,
          border: 'none', borderRadius: '14px', padding: '10px',
          fontSize: '12px', fontWeight: 600, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
        }}>
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M1 4v6h6M23 20v-6h-6" />
            <path d="M20.49 9A9 9 0 005.64 5.64L1 10M23 14l-4.64 4.36A9 9 0 013.51 15" />
          </svg>
          Foto Ulang
        </button>
      </div>
    </div>
  )
}

export default VerifyScanPage
