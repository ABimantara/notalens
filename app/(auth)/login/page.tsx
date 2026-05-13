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

const InputIcon = ({ children }: { children: React.ReactNode }) => (
  <span style={{
    position: 'absolute', left: '12px', top: '50%',
    transform: 'translateY(-50%)', color: '#9ca3af',
    display: 'flex', alignItems: 'center',
  }}>
    {children}
  </span>
)

const LoginPage = () => {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Login gagal')
        return
      }

      localStorage.setItem('token', data.token)
      localStorage.setItem('user', JSON.stringify(data.user))
      router.push('/dashboard')

    } catch {
      setError('Terjadi kesalahan. Coba lagi.')
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#e8edf5',
      display: 'flex',
      justifyContent: 'center',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    }}>
      {/* Container max 430px */}
      <div style={{
        width: '100%',
        maxWidth: '430px',
        minHeight: '100vh',
        background: '#f4f7fb',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 0 40px rgba(0,0,0,0.12)',
        overflowY: 'auto',
      }}>
        <div style={{ flex: 1, padding: '48px 24px 32px' }}>

          {/* Logo */}
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            textAlign: 'center', marginBottom: '32px',
          }}>
            <Image src="/logo.png" alt="NotaLens" width={80} height={80}
              style={{ borderRadius: '20px', marginBottom: '10px' }} />
            <div style={{
              fontSize: '20px', fontWeight: 800, color: '#0D307F',
              fontFamily: 'Georgia, serif', letterSpacing: '1px',
            }}>
              NotaLens
            </div>
            <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px', letterSpacing: '0.5px' }}>
              Smart Receipt Intelligence
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
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

            {/* Email */}
            <div>
              <label style={{
                fontSize: '10px', fontWeight: 700, color: '#64748b',
                letterSpacing: '0.8px', textTransform: 'uppercase',
              }}>
                Email Address
              </label>
              <div style={{ position: 'relative', marginTop: '6px' }}>
                <InputIcon>
                  <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M3 8l9 6 9-6" /><rect x="3" y="6" width="18" height="12" rx="2" />
                  </svg>
                </InputIcon>
                <input
                  type="email" placeholder="name@company.com"
                  value={email} onChange={e => setEmail(e.target.value)} required
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    background: '#fff', border: '1px solid #e2e8f0',
                    borderRadius: '12px', padding: '10px 12px 10px 38px',
                    fontSize: '13px', color: '#0f172a', outline: 'none',
                  }}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                alignItems: 'center', marginBottom: '6px',
              }}>
                <label style={{
                  fontSize: '10px', fontWeight: 700, color: '#64748b',
                  letterSpacing: '0.8px', textTransform: 'uppercase',
                }}>
                  Password
                </label>
                <span style={{ fontSize: '10px', color: '#0D307F', fontWeight: 700, cursor: 'pointer' }}>
                  Forgot Password?
                </span>
              </div>
              <div style={{ position: 'relative' }}>
                <InputIcon>
                  <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <rect x="3" y="11" width="18" height="11" rx="2" />
                    <path d="M7 11V7a5 5 0 0110 0v4" />
                  </svg>
                </InputIcon>
                <input
                  type={showPassword ? 'text' : 'password'} placeholder="••••••••"
                  value={password} onChange={e => setPassword(e.target.value)} required
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    background: '#fff', border: '1px solid #e2e8f0',
                    borderRadius: '12px', padding: '10px 38px 10px 38px',
                    fontSize: '13px', color: '#0f172a', outline: 'none',
                  }}
                />
                <span onClick={() => setShowPassword(p => !p)} style={{
                  position: 'absolute', right: '12px', top: '50%',
                  transform: 'translateY(-50%)', color: '#9ca3af', cursor: 'pointer',
                  display: 'flex', alignItems: 'center',
                }}>
                  {showPassword ? <EyeOpen /> : <EyeClosed />}
                </span>
              </div>
            </div>

            {/* Submit */}
            <button type="submit" style={{
              width: '100%', background: '#0D307F', color: '#fff',
              border: 'none', borderRadius: '12px', padding: '12px',
              fontSize: '13px', fontWeight: 800, cursor: 'pointer',
              letterSpacing: '1px', marginTop: '4px',
            }}>
              LOGIN →
            </button>
          </form>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', margin: '20px 0' }}>
            <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
            <span style={{ padding: '0 10px', fontSize: '10px', color: '#94a3b8' }}>OR</span>
            <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
          </div>

          {/* Register */}
          <button onClick={() => router.push('/register')} style={{
            width: '100%', background: '#fff', color: '#0D307F',
            border: '1.5px solid #e2e8f0', borderRadius: '12px', padding: '12px',
            fontSize: '13px', fontWeight: 800, cursor: 'pointer', letterSpacing: '1px',
          }}>
            CREATE ACCOUNT
          </button>

          {/* Footer */}
          <div style={{ textAlign: 'center', marginTop: '32px' }}>
            <p style={{ fontSize: '9px', color: '#94a3b8', marginBottom: '8px', letterSpacing: '0.5px' }}>
              SECURED BY NOTALENS INTELLIGENCE
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '16px' }}>
              {['Privacy Policy', 'Terms', 'Support'].map(t => (
                <span key={t} style={{ fontSize: '10px', color: '#0D307F', fontWeight: 700, cursor: 'pointer' }}>{t}</span>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}

export default LoginPage