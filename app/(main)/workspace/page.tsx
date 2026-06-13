'use client'
import React, { useEffect, useState, useCallback } from 'react'
import { useNav } from '@/app/components/AppLayout'
import { useRouter } from 'next/navigation'
import { useTheme } from '@/context/ThemeContext'
import { getToken } from '@/lib/auth'
import { formatRp } from '@/lib/amount'

interface WorkspaceItem {
  workspace_id: number
  name: string
  join_code: string
  creator_id: number
  budget: number | null
  created_at: string
  member_count: number
  total_expenses: number
}

export default function WorkspacePage() {
  const { setActiveNav } = useNav()
  const router = useRouter()
  const { darkMode } = useTheme()

  const [owned, setOwned] = useState<WorkspaceItem[]>([])
  const [joined, setJoined] = useState<WorkspaceItem[]>([])
  const [totalExpenses, setTotalExpenses] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const bg = darkMode ? '#0f172a' : '#f4f7fb'
  const cardBg = darkMode ? '#1e293b' : '#fff'
  const textPrimary = darkMode ? '#f1f5f9' : '#0f172a'
  const textSecondary = darkMode ? '#94a3b8' : '#64748b'
  const borderColor = darkMode ? '#334155' : '#e2e8f0'

  useEffect(() => { setActiveNav('WORKSPACE') }, [setActiveNav])

  const load = useCallback(async () => {
    const token = getToken()
    if (!token) { setError('Silakan login ulang'); setLoading(false); return }
    setLoading(true)
    try {
      const res = await fetch('/api/workspace', { headers: { Authorization: `Bearer ${token}` } })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Gagal memuat workspace'); return }
      setOwned(data.owned ?? [])
      setJoined(data.joined ?? [])
      setTotalExpenses(data.total_expenses ?? 0)
    } catch {
      setError('Terjadi kesalahan. Coba lagi.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const allWorkspaces = [...owned, ...joined]

  const WorkspaceCard = ({ ws }: { ws: WorkspaceItem }) => (
    <div
      onClick={() => router.push(`/workspace/${ws.workspace_id}`)}
      style={{
        background: cardBg, border: `1px solid ${borderColor}`,
        borderRadius: '14px', padding: '16px',
        display: 'flex', flexDirection: 'column', gap: '12px',
        cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.03)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h4 style={{ fontSize: '14px', fontWeight: 700, color: textPrimary, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {ws.name}
          </h4>
          {ws.creator_id !== owned[0]?.creator_id && owned.length === 0 && (
            <span style={{ fontSize: '10px', color: textSecondary }}>Anggota</span>
          )}
        </div>
        <svg width="16" height="16" fill="none" stroke={textSecondary} strokeWidth="2" viewBox="0 0 24 24">
          <path d="M9 18l6-6-6-6"/>
        </svg>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderTop: `1px solid ${borderColor}`, paddingTop: '10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '10px', color: textSecondary, fontWeight: 600, letterSpacing: '0.5px' }}>PENGELUARAN</span>
          <span style={{ fontSize: '13px', fontWeight: 800, color: darkMode ? '#7aa5f5' : '#0D307F' }}>
            {formatRp(ws.total_expenses)}
          </span>
        </div>
        {ws.budget && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '10px', color: textSecondary, fontWeight: 600, letterSpacing: '0.5px' }}>BUDGET</span>
            <span style={{ fontSize: '12px', color: textSecondary }}>{formatRp(ws.budget)}</span>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '10px', color: textSecondary, fontWeight: 600, letterSpacing: '0.5px' }}>ANGGOTA</span>
          <span style={{ fontSize: '12px', color: textSecondary }}>{ws.member_count} orang</span>
        </div>
      </div>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', height: 'calc(100vh - 140px)', overflowY: 'auto', paddingRight: '2px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>

      {/* Header */}
      <div>
        <h1 style={{ fontSize: '24px', fontWeight: 800, color: darkMode ? '#f1f5f9' : '#091e42', margin: 0, letterSpacing: '-0.5px' }}>
          Workspace Kamu
        </h1>
        <p style={{ fontSize: '12px', color: textSecondary, margin: '4px 0 0', lineHeight: '1.4' }}>
          Kelola dan pantau pengeluaran serta acara organisasi
        </p>
      </div>

      {/* Overview card */}
      <div style={{ background: '#0D307F', borderRadius: '14px', padding: '20px', color: '#fff', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '1px', color: '#9bc2ff' }}>OVERVIEW</span>
        <div>
          <div style={{ fontSize: '11px', color: '#cbdfff', marginBottom: '4px' }}>Total Pengeluaran</div>
          <div style={{ fontSize: '28px', fontWeight: 800, letterSpacing: '-0.5px' }}>
            {loading ? '...' : formatRp(totalExpenses)}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '20px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '12px', fontSize: '11px', color: '#cbdfff' }}>
          <div>{loading ? '...' : `${allWorkspaces.length} Workspace`}</div>
        </div>
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <button onClick={() => router.push('/workspace/join')} style={{ width: '100%', background: cardBg, color: textPrimary, border: `1px solid ${borderColor}`, padding: '13px', borderRadius: '10px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
          Bergabung via Kode Unik
        </button>
        <button onClick={() => router.push('/workspace/create')} style={{ width: '100%', background: '#0D307F', color: '#fff', border: 'none', padding: '13px', borderRadius: '10px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
          + Buat Workspace Baru
        </button>
      </div>

      {/* Error */}
      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '10px', padding: '10px 14px', fontSize: '12px', color: '#dc2626' }}>
          {error}
        </div>
      )}

      {/* Workspace list */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '20px', fontSize: '13px', color: textSecondary }}>Memuat...</div>
      ) : allWorkspaces.length === 0 ? (
        <div style={{ background: cardBg, borderRadius: '14px', padding: '24px', textAlign: 'center', border: `1px solid ${borderColor}` }}>
          <div style={{ fontSize: '13px', color: textSecondary }}>Belum ada workspace.</div>
          <div style={{ fontSize: '11px', color: textSecondary, marginTop: '4px' }}>Buat baru atau bergabung via kode.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {owned.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <span style={{ fontSize: '10px', fontWeight: 700, color: textSecondary, letterSpacing: '0.5px', textTransform: 'uppercase' }}>Dibuat oleh kamu</span>
              {owned.map(ws => <WorkspaceCard key={ws.workspace_id} ws={ws} />)}
            </div>
          )}
          {joined.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <span style={{ fontSize: '10px', fontWeight: 700, color: textSecondary, letterSpacing: '0.5px', textTransform: 'uppercase' }}>Workspace yang diikuti</span>
              {joined.map(ws => <WorkspaceCard key={ws.workspace_id} ws={ws} />)}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
