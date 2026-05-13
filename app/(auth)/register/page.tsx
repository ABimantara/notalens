'use client'
import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

const RegisterPage = () => {
  const router = useRouter()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [agree, setAgree] = useState(false)

  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!agree) { alert('Harus setuju dengan Terms!'); return }
    if (password !== confirmPassword) { alert('Password tidak sama!'); return }
    if (password.length < 8) { alert('Password minimal 8 karakter!'); return }

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        alert(data.error || 'Register gagal')
        return
      }

      localStorage.setItem('token', data.token)
      localStorage.setItem('user', JSON.stringify(data.user))
      router.push('/dashboard')

    } catch {
      alert('Terjadi kesalahan. Coba lagi.')
    }
  }

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

  const inputStyle: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box',
    background: '#fff', border: '1px solid #e2e8f0',
    borderRadius: '12px', padding: '10px 12px',
    fontSize: '13px', color: '#0f172a', outline: 'none',
    marginTop: '6px',
  }

  const labelStyle: React.CSSProperties = {
    fontSize: '10px', fontWeight: 700, color: '#64748b',
    letterSpacing: '0.8px', textTransform: 'uppercase',
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
        background: '#f4f4f4',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 0 40px rgba(0,0,0,0.12)',
        overflowY: 'auto',
      }}>
        <div style={{ flex: 1, padding: '48px 24px 32px' }}>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
            <button
              onClick={() => router.push('/')}
              style={{
                padding: '6px', borderRadius: '50%', border: 'none',
                background: 'transparent', cursor: 'pointer', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
              }}
            >
              <svg width="18" height="18" fill="none" stroke="black" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            <span style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '2px', color: '#0a1a3a', textTransform: 'uppercase' }}>
              Registration
            </span>
          </div>

          {/* Logo */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: '28px' }}>
            <Image src="/logo.png" alt="logo" width={80} height={80}
              style={{ borderRadius: '20px', marginBottom: '10px' }} />
            <h1 style={{ fontSize: '18px', fontWeight: 800, color: '#1B3A8A', margin: 0, fontFamily: 'Georgia, serif' }}>
              Create Account
            </h1>
          </div>

          {/* Form */}
          <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

            {/* Full Name */}
            <div>
              <label style={labelStyle}>Full Name</label>
              <input
                type="text" placeholder="John Doe"
                value={name} onChange={e => setName(e.target.value)} required
                style={inputStyle}
              />
            </div>

            {/* Email */}
            <div>
              <label style={labelStyle}>Email Address</label>
              <input
                type="email" placeholder="name@company.com"
                value={email} onChange={e => setEmail(e.target.value)} required
                style={inputStyle}
              />
            </div>

            {/* Password */}
            <div>
              <label style={labelStyle}>Password</label>
              <div style={{ position: 'relative', marginTop: '6px' }}>
                <input
                  type={showPassword ? 'text' : 'password'} placeholder="••••••••"
                  value={password} onChange={e => setPassword(e.target.value)} required
                  style={{ ...inputStyle, marginTop: 0, paddingRight: '38px' }}
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

            {/* Confirm Password */}
            <div>
              <label style={labelStyle}>Confirm Password</label>
              <div style={{ position: 'relative', marginTop: '6px' }}>
                <input
                  type={showConfirm ? 'text' : 'password'} placeholder="••••••••"
                  value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required
                  style={{ ...inputStyle, marginTop: 0, paddingRight: '38px' }}
                />
                <span onClick={() => setShowConfirm(p => !p)} style={{
                  position: 'absolute', right: '12px', top: '50%',
                  transform: 'translateY(-50%)', color: '#9ca3af', cursor: 'pointer',
                  display: 'flex', alignItems: 'center',
                }}>
                  {showConfirm ? <EyeOpen /> : <EyeClosed />}
                </span>
              </div>
            </div>

            {/* Terms */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '12px' }}>
              <input
                type="checkbox" checked={agree}
                onChange={e => setAgree(e.target.checked)}
                style={{ marginTop: '2px', cursor: 'pointer' }}
              />
              <p style={{ color: '#64748b', margin: 0, lineHeight: '1.5' }}>
                I agree to the{' '}
                <span style={{ color: '#1B3A8A', fontWeight: 700, cursor: 'pointer' }}>Terms of Service</span>
                {' '}and{' '}
                <span style={{ color: '#1B3A8A', fontWeight: 700, cursor: 'pointer' }}>Privacy Policy</span>
              </p>
            </div>

            {/* Submit */}
            <button type="submit" style={{
              width: '100%', background: '#1B3A8A', color: '#fff',
              border: 'none', borderRadius: '12px', padding: '12px',
              fontSize: '13px', fontWeight: 800, cursor: 'pointer',
              letterSpacing: '1px', marginTop: '4px',
            }}>
              REGISTER
            </button>

          </form>

          {/* Footer */}
          <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '12px' }}>
            <span style={{ color: '#64748b' }}>Already have an account? </span>
            <span
              onClick={() => router.push('/')}
              style={{ color: '#1B3A8A', fontWeight: 700, cursor: 'pointer' }}
            >
              LOGIN
            </span>
          </div>

        </div>
      </div>
    </div>
  )
}

export default RegisterPage