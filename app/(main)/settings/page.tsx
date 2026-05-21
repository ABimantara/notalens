'use client'
import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useNav } from '@/app/components/AppLayout'
import { logout } from '@/lib/auth'
import { useTheme } from '@/context/ThemeContext'

export default function SettingsPage() {
  const router = useRouter()
  const { setActiveNav } = useNav()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { darkMode, toggleTheme } = useTheme()
  const [user, setUser] = useState({ name: '', email: '' })
  const [avatar, setAvatar] = useState<string | null>(null)

  useEffect(() => {
    setActiveNav('SETTINGS')
    const stored = localStorage.getItem('user')
    if (stored) setUser(JSON.parse(stored))
    const savedAvatar = localStorage.getItem('avatar')
    if (savedAvatar) setAvatar(savedAvatar)
  }, [setActiveNav])

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

  const handleLogout = async () => {
    await logout()
    router.push('/')
  }

  const bg = darkMode ? '#0f172a' : '#f4f7fb'
  const cardBg = darkMode ? '#1e293b' : '#fff'
  const textPrimary = darkMode ? '#f1f5f9' : '#0f172a'
  const textSecondary = darkMode ? '#94a3b8' : '#64748b'
  const borderColor = darkMode ? '#334155' : '#f1f5f9'

  const SectionLabel = ({ title }: { title: string }) => (
    <div style={{
      fontSize: '10px', fontWeight: 700, color: textSecondary,
      letterSpacing: '1px', textTransform: 'uppercase',
      padding: '16px 16px 8px',
    }}>{title}</div>
  )

  const Row = ({ icon, label, sub, onClick, danger }: {
    icon: React.ReactNode, label: string, sub?: string,
    onClick?: () => void, danger?: boolean
  }) => (
    <div onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: '14px',
      padding: '14px 16px', background: cardBg,
      borderBottom: `1px solid ${borderColor}`,
      cursor: onClick ? 'pointer' : 'default',
    }}>
      <div style={{
        width: '36px', height: '36px', borderRadius: '10px',
        background: danger ? '#fef2f2' : '#eff6ff',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>{icon}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '13px', fontWeight: 600, color: danger ? '#dc2626' : textPrimary }}>{label}</div>
        {sub && <div style={{ fontSize: '11px', color: textSecondary, marginTop: '2px' }}>{sub}</div>}
      </div>
      {onClick && (
        <svg width="16" height="16" fill="none" stroke={textSecondary} strokeWidth="2" viewBox="0 0 24 24">
          <path d="M9 18l6-6-6-6" />
        </svg>
      )}
    </div>
  )

  return (
    <div style={{ height: '100%', overflowY: 'auto', background: bg, transition: 'background 0.3s' }}>

      {/* Profile Card */}
      <div style={{
        background: cardBg, padding: '28px 16px',
        textAlign: 'center', borderBottom: `1px solid ${borderColor}`,
      }}>
        <div style={{ position: 'relative', display: 'inline-block', marginBottom: '12px' }}>
          <div style={{
            width: '72px', height: '72px', borderRadius: '50%',
            background: '#0D307F', overflow: 'hidden',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '3px solid #e2e8f0', margin: '0 auto',
          }}>
            {avatar
              ? <img src={avatar} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <span style={{ fontSize: '28px', fontWeight: 800, color: '#fff' }}>
                  {user.name?.charAt(0)?.toUpperCase() || 'U'}
                </span>
            }
          </div>
          <div onClick={() => fileInputRef.current?.click()} style={{
            position: 'absolute', bottom: 0, right: 0,
            width: '24px', height: '24px', borderRadius: '50%',
            background: '#0D307F', display: 'flex', alignItems: 'center',
            justifyContent: 'center', cursor: 'pointer',
            boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
          }}>
            <svg width="12" height="12" fill="none" stroke="#fff" strokeWidth="2.5" viewBox="0 0 24 24">
              <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
          </div>
        </div>
        <div style={{ fontSize: '18px', fontWeight: 800, color: textPrimary }}>{user.name}</div>
        <div style={{ fontSize: '11px', color: textSecondary, marginTop: '4px', letterSpacing: '1px', textTransform: 'uppercase' }}>
          {user.email}
        </div>
      </div>

      {/* Account Settings */}
      <SectionLabel title="Account Settings" />
      <Row
        icon={<svg width="16" height="16" fill="none" stroke="#0D307F" strokeWidth="2" viewBox="0 0 24 24">
          <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" />
        </svg>}
        label="Edit Profile" sub="Change name & photo"
        onClick={() => router.push('/settings/edit-profile')}
      />
      <Row
        icon={<svg width="16" height="16" fill="none" stroke="#0D307F" strokeWidth="2" viewBox="0 0 24 24">
          <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" />
        </svg>}
        label="Security" sub="Change password"
        onClick={() => router.push('/settings/change-password')}
      />

      {/* App Preferences */}
      <SectionLabel title="App Preferences" />
      <div style={{
        display: 'flex', alignItems: 'center', gap: '14px',
        padding: '14px 16px', background: cardBg,
        borderBottom: `1px solid ${borderColor}`,
      }}>
        <div style={{
          width: '36px', height: '36px', borderRadius: '10px',
          background: '#eff6ff', display: 'flex', alignItems: 'center',
          justifyContent: 'center', flexShrink: 0,
        }}>
          <svg width="16" height="16" fill="none" stroke="#0D307F" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
          </svg>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '13px', fontWeight: 600, color: textPrimary }}>Dark Mode</div>
          <div style={{ fontSize: '11px', color: textSecondary, marginTop: '2px' }}>{darkMode ? 'On' : 'Off'}</div>
        </div>
        <div onClick={toggleTheme} style={{
          width: '44px', height: '24px', borderRadius: '12px',
          background: darkMode ? '#0D307F' : '#e2e8f0',
          position: 'relative', cursor: 'pointer', transition: 'background 0.3s',
        }}>
          <div style={{
            position: 'absolute', top: '3px',
            left: darkMode ? '23px' : '3px',
            width: '18px', height: '18px', borderRadius: '50%',
            background: '#fff', transition: 'left 0.3s',
            boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
          }} />
        </div>
      </div>
      <div onClick={() => router.push('/settings/notifications')} style={{
        display: 'flex', alignItems: 'center', gap: '14px',
        padding: '14px 16px', background: cardBg,
        borderBottom: `1px solid ${borderColor}`, cursor: 'pointer',
      }}>
        <div style={{
          width: '36px', height: '36px', borderRadius: '10px',
          background: '#eff6ff', display: 'flex', alignItems: 'center',
          justifyContent: 'center', flexShrink: 0,
        }}>
          <svg width="16" height="16" fill="none" stroke="#0D307F" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" />
          </svg>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '13px', fontWeight: 600, color: textPrimary }}>Notifications</div>
          <div style={{ fontSize: '11px', color: textSecondary, marginTop: '2px' }}>Manage alerts</div>
        </div>
        <svg width="16" height="16" fill="none" stroke={textSecondary} strokeWidth="2" viewBox="0 0 24 24">
          <path d="M9 18l6-6-6-6" />
        </svg>
      </div>

      {/* Information */}
      <SectionLabel title="Information" />
      <Row
        icon={<svg width="16" height="16" fill="none" stroke="#0D307F" strokeWidth="2" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" />
        </svg>}
        label="About" sub="NotaLens v1.0.0"
      />

      {/* Logout */}
      <div style={{ padding: '20px 16px' }}>
        <button onClick={handleLogout} style={{
          width: '100%', background: '#0D307F', color: '#fff',
          border: 'none', borderRadius: '14px', padding: '14px',
          fontSize: '13px', fontWeight: 800, cursor: 'pointer',
          letterSpacing: '1px', display: 'flex', alignItems: 'center',
          justifyContent: 'center', gap: '8px',
        }}>
          <svg width="16" height="16" fill="none" stroke="#fff" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
          </svg>
          LOGOUT
        </button>
        <div style={{ textAlign: 'center', marginTop: '12px', fontSize: '10px', color: textSecondary, letterSpacing: '0.5px' }}>
          NOTALENS v1.0.0
        </div>
      </div>

      <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />
    </div>
  )
}