'use client'
import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTheme } from '@/context/ThemeContext'

export default function NotificationsPage() {
  const router = useRouter()
  const { darkMode } = useTheme()

  const [settings, setSettings] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('notif_settings')
      if (saved) return JSON.parse(saved)
    }
    return { scanReminder: true, weeklyRecap: true, budgetAlert: false, newFeatures: true }
  })

  const toggle = (key: keyof typeof settings) => {
    setSettings((p: typeof settings) => {
      const next = { ...p, [key]: !p[key] }
      localStorage.setItem('notif_settings', JSON.stringify(next))
      return next
    })
  }

  const bg = darkMode ? '#0f172a' : '#f4f7fb'
  const cardBg = darkMode ? '#1e293b' : '#fff'
  const textPrimary = darkMode ? '#f1f5f9' : '#0f172a'
  const textSecondary = darkMode ? '#94a3b8' : '#64748b'
  const borderColor = darkMode ? '#334155' : '#f1f5f9'

  const Toggle = ({ active, onToggle }: { active: boolean, onToggle: () => void }) => (
    <div onClick={onToggle} style={{
      width: '44px', height: '24px', borderRadius: '12px',
      background: active ? '#0D307F' : '#e2e8f0',
      position: 'relative', cursor: 'pointer', transition: 'background 0.3s', flexShrink: 0,
    }}>
      <div style={{
        position: 'absolute', top: '3px',
        left: active ? '23px' : '3px',
        width: '18px', height: '18px', borderRadius: '50%',
        background: '#fff', transition: 'left 0.3s',
        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
      }} />
    </div>
  )

  const NotifRow = ({ icon, label, sub, settingKey }: {
    icon: React.ReactNode, label: string, sub: string,
    settingKey: keyof typeof settings
  }) => (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '14px',
      padding: '14px 16px', background: cardBg,
      borderBottom: `1px solid ${borderColor}`,
    }}>
      <div style={{
        width: '36px', height: '36px', borderRadius: '10px',
        background: '#eff6ff', display: 'flex', alignItems: 'center',
        justifyContent: 'center', flexShrink: 0,
      }}>{icon}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '13px', fontWeight: 600, color: textPrimary }}>{label}</div>
        <div style={{ fontSize: '11px', color: textSecondary, marginTop: '2px' }}>{sub}</div>
      </div>
      <Toggle active={settings[settingKey]} onToggle={() => toggle(settingKey)} />
    </div>
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
        <span style={{ fontSize: '14px', fontWeight: 800, color: '#0D307F' }}>Notifications</span>
      </div>

      <div style={{ padding: '8px 16px 0', fontSize: '10px', fontWeight: 700, color: textSecondary, letterSpacing: '1px', textTransform: 'uppercase' }}>
        Alerts
      </div>

      <NotifRow
        settingKey="scanReminder"
        icon={<svg width="16" height="16" fill="none" stroke="#0D307F" strokeWidth="2" viewBox="0 0 24 24">
          <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" /><circle cx="12" cy="13" r="4" />
        </svg>}
        label="Scan Reminder"
        sub="Remind to scan receipts daily"
      />
      <NotifRow
        settingKey="weeklyRecap"
        icon={<svg width="16" height="16" fill="none" stroke="#0D307F" strokeWidth="2" viewBox="0 0 24 24">
          <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
        </svg>}
        label="Weekly Recap"
        sub="Summary every Monday morning"
      />
      <NotifRow
        settingKey="budgetAlert"
        icon={<svg width="16" height="16" fill="none" stroke="#0D307F" strokeWidth="2" viewBox="0 0 24 24">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
        </svg>}
        label="Budget Alert"
        sub="Alert when spending is high"
      />

      <div style={{ padding: '16px 16px 0', fontSize: '10px', fontWeight: 700, color: textSecondary, letterSpacing: '1px', textTransform: 'uppercase' }}>
        General
      </div>

      <NotifRow
        settingKey="newFeatures"
        icon={<svg width="16" height="16" fill="none" stroke="#0D307F" strokeWidth="2" viewBox="0 0 24 24">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>}
        label="New Features"
        sub="Updates and new features info"
      />
    </div>
  )
}