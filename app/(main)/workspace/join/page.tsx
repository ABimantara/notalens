'use client'
import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTheme } from '@/context/ThemeContext'
import { getToken } from '@/lib/auth'

export default function JoinWorkspacePage() {
  const router = useRouter()
  const { darkMode } = useTheme()
  const [inputCode, setInputCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const cardBg = darkMode ? '#1e293b' : '#fff'
  const textPrimary = darkMode ? '#f1f5f9' : '#0f172a'
  const textSecondary = darkMode ? '#94a3b8' : '#64748b'
  const borderColor = darkMode ? '#334155' : '#e2e8f0'

  const handleJoinSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!inputCode.trim()) {
      setError('Masukkan kode akses terlebih dahulu')
      return
    }

    const token = getToken()
    if (!token) { setError('Silakan login ulang'); return }

    setIsLoading(true)
    try {
      const res = await fetch('/api/workspace/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ join_code: inputCode.trim().toUpperCase() }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Gagal bergabung ke workspace')
        return
      }

      // Navigate to the joined workspace
      router.push(`/workspace/${data.workspace_id}`)
    } catch {
      setError('Terjadi kesalahan. Coba lagi.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: '24px',
      justifyContent: 'center', minHeight: 'calc(100vh - 180px)',
      padding: '0 8px', boxSizing: 'border-box',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    }}>
      <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#0D307F', margin: 0 }}>Gabung Workspace</h2>
        <p style={{ fontSize: '13px', color: textSecondary, lineHeight: '1.5', margin: 0, padding: '0 20px' }}>
          Masukkan kode akses unik yang dibagikan oleh ketua tim kamu.
        </p>
      </div>

      <form onSubmit={handleJoinSubmit} style={{
        display: 'flex', flexDirection: 'column', gap: '16px',
        background: cardBg, border: `1px solid ${borderColor}`,
        borderRadius: '16px', padding: '24px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
      }}>
        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '10px', padding: '10px 12px', fontSize: '12px', color: '#dc2626' }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ fontSize: '10px', fontWeight: 800, color: textSecondary, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
            Kode Akses Unik
          </label>
          <input
            type="text"
            placeholder="Contoh: AB1C2D"
            value={inputCode}
            onChange={e => setInputCode(e.target.value.toUpperCase())}
            disabled={isLoading}
            maxLength={6}
            style={{
              height: '52px', width: '100%', padding: '0 16px',
              borderRadius: '10px', border: `1.5px solid ${borderColor}`,
              fontSize: '22px', fontWeight: 800, color: textPrimary,
              letterSpacing: '4px', textTransform: 'uppercase', textAlign: 'center',
              outline: 'none', background: isLoading ? (darkMode ? '#334155' : '#f1f5f9') : cardBg,
              boxSizing: 'border-box', transition: 'border-color 0.2s',
            }}
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          style={{
            height: '48px', width: '100%', borderRadius: '10px', border: 'none',
            background: isLoading ? '#6b8fd4' : '#0D307F', color: '#fff',
            fontSize: '14px', fontWeight: 700,
            cursor: isLoading ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            boxSizing: 'border-box',
          }}
        >
          {isLoading ? 'Memvalidasi...' : 'Gabung Workspace'}
        </button>

        <button
          type="button"
          onClick={() => router.push('/workspace')}
          disabled={isLoading}
          style={{
            height: '40px', width: '100%', borderRadius: '10px',
            border: `1px solid ${borderColor}`, background: 'transparent',
            color: textSecondary, fontSize: '13px', fontWeight: 600,
            cursor: 'pointer', boxSizing: 'border-box',
          }}
        >
          Kembali
        </button>
      </form>
    </div>
  )
}
