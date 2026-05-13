'use client'
import { useEffect } from 'react'
import { useNav } from '@/app/components/AppLayout'

export default function SettingsPage() {
  const { setActiveNav } = useNav()
  useEffect(() => { setActiveNav('SETTINGS') }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '12px' }}>
      <div style={{ fontSize: '40px' }}>⚙️</div>
      <p style={{ fontSize: '16px', fontWeight: 800, color: '#0a1a3a', margin: 0 }}>Settings</p>
      <p style={{ fontSize: '12px', color: '#7a90b0', margin: 0 }}>Coming soon</p>
    </div>
  )
}