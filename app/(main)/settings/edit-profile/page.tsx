'use client'
import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useTheme } from '@/context/ThemeContext'

export default function EditProfilePage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { darkMode } = useTheme()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [avatar, setAvatar] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const bg = darkMode ? '#0f172a' : '#f4f7fb'
  const cardBg = darkMode ? '#1e293b' : '#fff'
  const textPrimary = darkMode ? '#f1f5f9' : '#0f172a'
  const textSecondary = darkMode ? '#94a3b8' : '#94a3b8'
  const borderColor = darkMode ? '#334155' : '#e2e8f0'

  useEffect(() => {
    const stored = localStorage.getItem('user')
    if (stored) {
      const u = JSON.parse(stored)
      setName(u.name || '')
      setEmail(u.email || '')
    }
    const savedAvatar = localStorage.getItem('avatar')
    if (savedAvatar) setAvatar(savedAvatar)
  }, [])

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      setAvatar(result)
      localStorage.setItem('avatar', result)
    }
    reader.readAsDataURL(file)
  }

  const handleSave = () => {
    const stored = localStorage.getItem('user')
    const user = stored ? JSON.parse(stored) : {}
    localStorage.setItem('user', JSON.stringify({ ...user, name, email }))
    setSaved(true)
    setTimeout(() => { setSaved(false); router.push('/settings') }, 1000)
  }

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
        <span style={{ fontSize: '14px', fontWeight: 800, color: '#0D307F', letterSpacing: '0.5px' }}>Edit Profile</span>
      </div>

      {/* Avatar */}
      <div style={{ background: '#0D307F', padding: '28px 16px', textAlign: 'center' }}>
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <div style={{
            width: '80px', height: '80px', borderRadius: '50%',
            background: '#1e4bb8', overflow: 'hidden',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '3px solid rgba(255,255,255,0.3)',
          }}>
            {avatar
              ? <img src={avatar} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <span style={{ fontSize: '32px', fontWeight: 800, color: '#fff' }}>{name?.charAt(0)?.toUpperCase() || 'U'}</span>
            }
          </div>
          <div onClick={() => fileInputRef.current?.click()} style={{
            position: 'absolute', bottom: 0, right: 0,
            width: '28px', height: '28px', borderRadius: '50%',
            background: '#fff', display: 'flex', alignItems: 'center',
            justifyContent: 'center', cursor: 'pointer',
            boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
          }}>
            <svg width="14" height="14" fill="none" stroke="#0D307F" strokeWidth="2.5" viewBox="0 0 24 24">
              <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
          </div>
        </div>
        <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', marginTop: '10px' }}>
          Tap camera icon to change photo
        </div>
      </div>

      {/* Form */}
      <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* Full Name */}
        <div style={{ background: cardBg, borderRadius: '14px', padding: '14px' }}>
          <label style={{ fontSize: '10px', fontWeight: 700, color: textSecondary, letterSpacing: '0.8px', textTransform: 'uppercase' }}>Full Name</label>
          <input value={name} onChange={e => setName(e.target.value)}
            style={{ width: '100%', boxSizing: 'border-box', border: 'none', outline: 'none', marginTop: '6px',
              fontSize: '14px', fontWeight: 600, color: textPrimary, background: 'transparent', padding: 0 }} />
        </div>

        {/* Email */}
        <div style={{ background: cardBg, borderRadius: '14px', padding: '14px' }}>
          <label style={{ fontSize: '10px', fontWeight: 700, color: textSecondary, letterSpacing: '0.8px', textTransform: 'uppercase' }}>Email Address</label>
          <input value={email} onChange={e => setEmail(e.target.value)}
            style={{ width: '100%', boxSizing: 'border-box', border: 'none', outline: 'none', marginTop: '6px',
              fontSize: '14px', fontWeight: 600, color: textPrimary, background: 'transparent', padding: 0 }} />
        </div>

        {/* Member Since */}
        <div style={{ background: cardBg, borderRadius: '14px', padding: '14px' }}>
          <label style={{ fontSize: '10px', fontWeight: 700, color: textSecondary, letterSpacing: '0.8px', textTransform: 'uppercase' }}>Member Since</label>
          <div style={{ fontSize: '14px', fontWeight: 600, color: textPrimary, marginTop: '6px' }}>May 2026</div>
        </div>

        <button onClick={handleSave} style={{
          width: '100%', background: saved ? '#22c55e' : '#0D307F',
          color: '#fff', border: 'none', borderRadius: '14px',
          padding: '14px', fontSize: '13px', fontWeight: 800,
          cursor: 'pointer', letterSpacing: '1px', marginTop: '8px', transition: 'background 0.3s',
        }}>
          {saved ? '✓ SAVED!' : 'SAVE CHANGES'}
        </button>
      </div>

      <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />
    </div>
  )
}