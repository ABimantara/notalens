'use client'
import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTheme } from '@/context/ThemeContext'
import { getToken } from '@/lib/auth'

export default function CreateWorkspacePage() {
  const router = useRouter()
  const { darkMode } = useTheme()

  const [name, setName] = useState('')
  const [budget, setBudget] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  // After creation, show the generated join code
  const [createdCode, setCreatedCode] = useState<string | null>(null)
  const [createdId, setCreatedId] = useState<number | null>(null)

  const cardBg = darkMode ? '#1e293b' : '#fff'
  const textPrimary = darkMode ? '#f1f5f9' : '#0f172a'
  const textSecondary = darkMode ? '#94a3b8' : '#64748b'
  const borderColor = darkMode ? '#334155' : '#e2e8f0'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const token = getToken()
    if (!token) { setError('Silakan login ulang'); return }
    if (!name.trim()) { setError('Nama workspace wajib diisi'); return }

    setLoading(true)
    try {
      const res = await fetch('/api/workspace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: name.trim(), budget: budget ? Number(budget) : undefined }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Gagal membuat workspace'); return }
      setCreatedCode(data.workspace.join_code)
      setCreatedId(data.workspace.workspace_id)
    } catch {
      setError('Terjadi kesalahan. Coba lagi.')
    } finally {
      setLoading(false)
    }
  }

  // Success screen after creation
  if (createdCode) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '24px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingTop: '10px' }}>
          <button type="button" onClick={() => router.push('/workspace')} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0D307F" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#0D307F', margin: 0 }}>Workspace Dibuat!</h1>
        </div>

        <div style={{ background: '#eff6ff', borderRadius: '14px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center', textAlign: 'center' }}>
          <div style={{ fontSize: '13px', color: '#1e40af' }}>Bagikan kode ini ke anggota tim kamu</div>
          <div style={{ fontSize: '32px', fontWeight: 800, color: '#0D307F', letterSpacing: '4px', background: '#fff', padding: '14px 28px', borderRadius: '12px', border: '2px dashed #0D307F' }}>
            {createdCode}
          </div>
          <button
            onClick={() => { navigator.clipboard.writeText(createdCode); alert('Kode Disalin! 📋') }}
            style={{ background: '#0D307F', color: '#fff', border: 'none', borderRadius: '10px', padding: '10px 24px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
          >
            Salin Kode
          </button>
        </div>

        <button
          onClick={() => router.push(`/workspace/${createdId}`)}
          style={{ width: '100%', background: '#0D307F', color: '#fff', border: 'none', padding: '14px', borderRadius: '10px', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}
        >
          Buka Workspace →
        </button>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '24px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingTop: '10px' }}>
        <button type="button" onClick={() => router.push('/workspace')} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0D307F" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#0D307F', margin: 0, letterSpacing: '-0.5px' }}>Workspace Baru</h1>
      </div>

      <p style={{ fontSize: '12px', color: textSecondary, margin: '-10px 0 0', lineHeight: '1.4' }}>
        Atur parameter workspace acara kamu. Kode bergabung dibuat otomatis.
      </p>

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '10px', padding: '10px 14px', fontSize: '12px', color: '#dc2626' }}>{error}</div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '10px', fontWeight: 800, color: textSecondary, letterSpacing: '0.5px', textTransform: 'uppercase' }}>Nama Workspace</label>
          <input
            type="text" required placeholder="Contoh: Gala Tahunan 2026"
            value={name} onChange={e => setName(e.target.value)}
            style={{ padding: '12px', borderRadius: '10px', border: `1px solid ${borderColor}`, fontSize: '14px', color: textPrimary, background: cardBg, outline: 'none' }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '10px', fontWeight: 800, color: textSecondary, letterSpacing: '0.5px', textTransform: 'uppercase' }}>Estimasi Budget (opsional)</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px', borderRadius: '10px', border: `1px solid ${borderColor}`, background: cardBg }}>
            <span style={{ fontSize: '13px', color: textSecondary, fontWeight: 600 }}>Rp</span>
            <input
              type="text" placeholder="0"
              value={budget ? Number(budget).toLocaleString('id-ID') : ''}
              onChange={e => setBudget(e.target.value.replace(/\D/g, ''))}
              style={{ flex: 1, border: 'none', outline: 'none', fontSize: '14px', fontWeight: 600, color: textPrimary, background: 'transparent', padding: 0 }}
            />
          </div>
        </div>

        <button
          type="submit" disabled={loading}
          style={{ marginTop: '8px', background: loading ? '#6b8fd4' : '#0D307F', color: '#fff', border: 'none', padding: '14px', borderRadius: '10px', fontSize: '14px', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer' }}
        >
          {loading ? 'Membuat...' : 'Buat Workspace Sekarang'}
        </button>
      </form>
    </div>
  )
}
