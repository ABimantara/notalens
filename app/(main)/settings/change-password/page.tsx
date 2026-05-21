'use client'
import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTheme } from '@/context/ThemeContext'

export default function ChangePasswordPage() {
  const router = useRouter()
  const { darkMode } = useTheme()

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  const bg = darkMode ? '#0f172a' : '#f4f7fb'
  const cardBg = darkMode ? '#1e293b' : '#fff'
  const textPrimary = darkMode ? '#f1f5f9' : '#0f172a'
  const textSecondary = darkMode ? '#94a3b8' : '#94a3b8'
  const borderColor = darkMode ? '#334155' : '#e2e8f0'

  const handleUpdate = () => {
    setError('')
    if (newPassword.length < 8) { setError('Password minimal 8 karakter'); return }
    if (newPassword !== confirmPassword) { setError('Password tidak sama'); return }
    setSaved(true)
    setTimeout(() => { setSaved(false); router.push('/settings') }, 1000)
  }

  const EyeIcon = ({ open }: { open: boolean }) => (
    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      {open
        ? <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></>
        : <><path d="M17.94 17.94A10.94 10.94 0 0112 20C5 20 1 12 1 12a21.77 21.77 0 015.06-6.94" /><path d="M1 1l22 22" /></>
      }
    </svg>
  )

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
        <div onClick={() => router.push('/settings')} style={{ cursor: 'pointer' }}>
          <svg width="20" height="20" fill="none" stroke="#0D307F" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </div>
        <span style={{ fontSize: '14px', fontWeight: 800, color: '#0D307F', letterSpacing: '0.5px' }}>
          Change Password
        </span>
      </div>

      {/* Title */}
      <div style={{ padding: '24px 16px 8px' }}>
        <div style={{ fontSize: '20px', fontWeight: 800, color: textPrimary }}>Security Update</div>
        <div style={{ fontSize: '12px', color: textSecondary, marginTop: '4px' }}>
          Manage your account credentials with surgical precision.
        </div>
      </div>

      {/* Form */}
      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '10px', padding: '10px 14px', fontSize: '12px', color: '#dc2626' }}>
            {error}
          </div>
        )}

        {/* New Password */}
        <div style={{ background: cardBg, borderRadius: '14px', padding: '14px' }}>
          <label style={{ fontSize: '10px', fontWeight: 700, color: textSecondary, letterSpacing: '0.8px', textTransform: 'uppercase' }}>
            New Password
          </label>
          <div style={{ position: 'relative', marginTop: '6px' }}>
            <input type={showNew ? 'text' : 'password'} placeholder="••••••••" value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              style={{ width: '100%', boxSizing: 'border-box', border: 'none', outline: 'none',
                fontSize: '14px', fontWeight: 600, color: textPrimary, background: 'transparent', padding: 0 }} />
            <span onClick={() => setShowNew(p => !p)} style={{ position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)', color: textSecondary, cursor: 'pointer' }}>
              <EyeIcon open={showNew} />
            </span>
          </div>
        </div>

        {/* Confirm Password */}
        <div style={{ background: cardBg, borderRadius: '14px', padding: '14px' }}>
          <label style={{ fontSize: '10px', fontWeight: 700, color: textSecondary, letterSpacing: '0.8px', textTransform: 'uppercase' }}>
            Confirm New Password
          </label>
          <div style={{ position: 'relative', marginTop: '6px' }}>
            <input type={showConfirm ? 'text' : 'password'} placeholder="••••••••" value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              style={{ width: '100%', boxSizing: 'border-box', border: 'none', outline: 'none',
                fontSize: '14px', fontWeight: 600, color: textPrimary, background: 'transparent', padding: 0 }} />
            <span onClick={() => setShowConfirm(p => !p)} style={{ position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)', color: textSecondary, cursor: 'pointer' }}>
              <EyeIcon open={showConfirm} />
            </span>
          </div>
        </div>

        <button onClick={handleUpdate} style={{
          width: '100%', background: saved ? '#22c55e' : '#0D307F',
          color: '#fff', border: 'none', borderRadius: '14px',
          padding: '14px', fontSize: '13px', fontWeight: 800,
          cursor: 'pointer', letterSpacing: '1px', marginTop: '8px', transition: 'background 0.3s',
        }}>
          {saved ? '✓ UPDATED!' : 'UPDATE PASSWORD'}
        </button>

        <div style={{ textAlign: 'center', fontSize: '11px', color: textSecondary }}>
          All changes are logged for security purposes.
        </div>
      </div>
    </div>
  )
}