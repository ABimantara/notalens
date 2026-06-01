'use client'
import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

const EyeOpen = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
)

const EyeClosed = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path d="M17.94 17.94A10.94 10.94 0 0112 20C5 20 1 12 1 12a21.77 21.77 0 015.06-6.94" />
    <path d="M1 1l22 22" />
  </svg>
)

export default function ForgotPasswordPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (newPassword.length < 8) {
      setError('Password minimal 8 karakter')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Password tidak sama')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, newPassword }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Gagal mereset password')
        return
      }

      setDone(true)
    } catch {
      setError('Terjadi kesalahan. Coba lagi.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#e8edf5',
      display: 'flex', justifyContent: 'center',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    }}>
      <div style={{
        width: '100%', maxWidth: '430px', minHeight: '100vh',
        background: '#f4f7fb', display: 'flex', flexDirection: 'column',
        boxShadow: '0 0 40px rgba(0,0,0,0.12)', overflowY: 'auto',
      }}>
        <div style={{ flex: 1, padding: '48px 24px 32px' }}>

          {/* Back button */}
          <div onClick={() => router.push('/')} style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            cursor: 'pointer', marginBottom: '28px',
          }}>
            <svg width="18" height="18" fill="none" stroke="#0D307F" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M15 18l-6-6 6-6" />
            </svg>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#0D307F' }}>Back to Login</span>
          </div>

          {/* Logo */}
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            textAlign: 'center', marginBottom: '32px',
          }}>
            <Image src="/logo.png" alt="NotaLens" width={80} height={80}
              style={{ borderRadius: '20px', marginBottom: '10px' }} />
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#0D307F', fontFamily: 'Georgia, serif', letterSpacing: '1px' }}>
              NotaLens
            </div>
            <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px', letterSpacing: '0.5px' }}>
              Smart Receipt Intelligence
            </div>
          </div>

          {!done ? (
            <>
              {/* Title */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', marginBottom: '6px' }}>
                  Reset Password
                </div>
                <div style={{ fontSize: '12px', color: '#94a3b8', lineHeight: '1.6' }}>
                  Masukkan email dan password baru kamu.
                </div>
              </div>

              {/* Error */}
              {error && (
                <div style={{
                  background: '#fef2f2', border: '1px solid #fca5a5',
                  borderRadius: '10px', padding: '8px 12px',
                  fontSize: '11px', color: '#dc2626', marginBottom: '14px',
                }}>
                  {error}
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

                {/* Email */}
                <div>
                  <label style={{
                    fontSize: '10px', fontWeight: 700, color: '#64748b',
                    letterSpacing: '0.8px', textTransform: 'uppercase',
                  }}>Email Address</label>
                  <div style={{ position: 'relative', marginTop: '6px' }}>
                    <span style={{
                      position: 'absolute', left: '12px', top: '50%',
                      transform: 'translateY(-50%)', color: '#9ca3af', display: 'flex', alignItems: 'center',
                    }}>
                      <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M3 8l9 6 9-6" /><rect x="3" y="6" width="18" height="12" rx="2" />
                      </svg>
                    </span>
                    <input type="email" placeholder="name@company.com"
                      value={email} onChange={e => setEmail(e.target.value)} required
                      style={{
                        width: '100%', boxSizing: 'border-box',
                        background: '#fff', border: '1px solid #e2e8f0',
                        borderRadius: '12px', padding: '10px 12px 10px 38px',
                        fontSize: '13px', color: '#0f172a', outline: 'none',
                      }} />
                  </div>
                </div>

                {/* New Password */}
                <div>
                  <label style={{
                    fontSize: '10px', fontWeight: 700, color: '#64748b',
                    letterSpacing: '0.8px', textTransform: 'uppercase',
                  }}>Password Baru</label>
                  <div style={{ position: 'relative', marginTop: '6px' }}>
                    <span style={{
                      position: 'absolute', left: '12px', top: '50%',
                      transform: 'translateY(-50%)', color: '#9ca3af', display: 'flex', alignItems: 'center',
                    }}>
                      <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" />
                      </svg>
                    </span>
                    <input type={showNew ? 'text' : 'password'} placeholder="••••••••"
                      value={newPassword} onChange={e => setNewPassword(e.target.value)} required
                      style={{
                        width: '100%', boxSizing: 'border-box',
                        background: '#fff', border: '1px solid #e2e8f0',
                        borderRadius: '12px', padding: '10px 38px',
                        fontSize: '13px', color: '#0f172a', outline: 'none',
                      }} />
                    <span onClick={() => setShowNew(p => !p)} style={{
                      position: 'absolute', right: '12px', top: '50%',
                      transform: 'translateY(-50%)', color: '#9ca3af', cursor: 'pointer',
                      display: 'flex', alignItems: 'center',
                    }}>
                      {showNew ? <EyeOpen /> : <EyeClosed />}
                    </span>
                  </div>
                </div>

                {/* Confirm Password */}
                <div>
                  <label style={{
                    fontSize: '10px', fontWeight: 700, color: '#64748b',
                    letterSpacing: '0.8px', textTransform: 'uppercase',
                  }}>Konfirmasi Password</label>
                  <div style={{ position: 'relative', marginTop: '6px' }}>
                    <span style={{
                      position: 'absolute', left: '12px', top: '50%',
                      transform: 'translateY(-50%)', color: '#9ca3af', display: 'flex', alignItems: 'center',
                    }}>
                      <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" />
                      </svg>
                    </span>
                    <input type={showConfirm ? 'text' : 'password'} placeholder="••••••••"
                      value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required
                      style={{
                        width: '100%', boxSizing: 'border-box',
                        background: '#fff', border: '1px solid #e2e8f0',
                        borderRadius: '12px', padding: '10px 38px',
                        fontSize: '13px', color: '#0f172a', outline: 'none',
                      }} />
                    <span onClick={() => setShowConfirm(p => !p)} style={{
                      position: 'absolute', right: '12px', top: '50%',
                      transform: 'translateY(-50%)', color: '#9ca3af', cursor: 'pointer',
                      display: 'flex', alignItems: 'center',
                    }}>
                      {showConfirm ? <EyeOpen /> : <EyeClosed />}
                    </span>
                  </div>
                </div>

                <button type="submit" disabled={loading} style={{
                  width: '100%', background: loading ? '#6b8fd4' : '#0D307F',
                  color: '#fff', border: 'none', borderRadius: '12px',
                  padding: '12px', fontSize: '13px', fontWeight: 800,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  letterSpacing: '1px', marginTop: '4px',
                }}>
                  {loading ? 'MEMPROSES...' : 'RESET PASSWORD →'}
                </button>
              </form>
            </>
          ) : (
            /* Success */
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{
                width: '64px', height: '64px', borderRadius: '50%',
                background: '#eff6ff', display: 'flex', alignItems: 'center',
                justifyContent: 'center', margin: '0 auto 16px',
              }}>
                <svg width="28" height="28" fill="none" stroke="#0D307F" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              </div>
              <div style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>
                Password Berhasil Direset!
              </div>
              <div style={{ fontSize: '12px', color: '#94a3b8', lineHeight: '1.6', marginBottom: '24px' }}>
                Password kamu sudah diperbarui. Silakan login dengan password baru.
              </div>
              <button onClick={() => router.push('/')} style={{
                width: '100%', background: '#0D307F', color: '#fff',
                border: 'none', borderRadius: '12px', padding: '12px',
                fontSize: '13px', fontWeight: 800, cursor: 'pointer', letterSpacing: '1px',
              }}>
                LOGIN SEKARANG →
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}