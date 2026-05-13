'use client'
import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useNav } from '@/app/components/AppLayout'
import { logout } from '@/lib/auth'

interface Activity {
  name: string
  date: string
  amount: string
  neg: boolean
  income: boolean
  svg: string
}

interface QuickAction {
  label: string
  route: string
  svg: string
}

const DashboardPage: React.FC = () => {
  const { setActiveNav } = useNav()
  const router = useRouter()
  const [pressedAction, setPressedAction] = useState<string | null>(null)
  const [user, setUser] = useState<{ name?: string }>({})

  useEffect(() => {
    setActiveNav('HOME')
    const stored = localStorage.getItem('user')
    if (stored) setUser(JSON.parse(stored))
  }, [])

  const handleActionPress = (label: string) => {
    setPressedAction(label)
    setTimeout(() => setPressedAction(null), 180)
  }

  const handleLogout = async () => {
  await logout()
  router.push('/')
}
  function getGreeting() {
    const hour = new Date().getHours()
    if (hour >= 5 && hour < 12) return 'Good Morning'
    if (hour >= 12 && hour < 18) return 'Good Afternoon'
    if (hour >= 18 && hour < 22) return 'Good Evening'
    return 'Good Night'
  }

  const activities: Activity[] = [
    {
      name: 'Apple Store', date: 'May 12, 2024', amount: '-$999.00', neg: true, income: false,
      svg: `<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>`,
    },
    {
      name: 'Salary Deposit', date: 'May 10, 2024', amount: '+$7,200.00', neg: false, income: true,
      svg: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>`,
    },
    {
      name: 'The Bistro', date: 'May 09, 2024', amount: '-$42.50', neg: true, income: false,
      svg: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 8h1a4 4 0 010 8h-1"/><path d="M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>`,
    },
    {
      name: 'Netflix', date: 'May 08, 2024', amount: '-$15.99', neg: true, income: false,
      svg: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>`,
    },
  ]

  const quickActions: QuickAction[] = [
    {
      label: 'Scan', route: '/scan',
      svg: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M3 7V5a2 2 0 0 1 2-2h2m10 0h2a2 2 0 0 1 2 2v2m0 10v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2"></path><rect x="7" y="7" width="3" height="3" fill="currentColor"></rect><rect x="14" y="7" width="3" height="3" fill="currentColor"></rect><rect x="7" y="14" width="3" height="3" fill="currentColor"></rect><rect x="14" y="14" width="3" height="3" fill="currentColor"></rect></svg>`,
    },
    {
      label: 'Workspace', route: '/workspace',
      svg: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path><path d="M12 11h.01"></path></svg>`,
    },
    {
      label: 'Recap', route: '/recap',
      svg: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><path d="M16 13H8"></path><path d="M16 17H8"></path><path d="M10 9H8"></path></svg>`,
    },
    {
      label: 'Settings', route: '/settings',
      svg: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1-1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>`,
    },
  ]

  const chartBars = [35, 60, 42, 85, 58, 75, 48]

  return (
    <>
      {/* Greeting */}
      <div style={{ marginBottom: '14px' }}>
        <p style={{ fontSize: '11px', color: '#7a90b0', margin: '0 0 2px', fontWeight: 500 }}>
          {getGreeting()}
        </p>
        <h1 style={{
          fontSize: '21px', fontWeight: 800, color: '#0a1a3a', margin: 0,
          fontFamily: 'Georgia, serif', letterSpacing: '-0.5px',
        }}>
          Welcome, {user.name || 'user'}! 👋
        </h1>
      </div>

      {/* Balance Card */}
      <div style={{
        background: '#0D307F', color: '#fff', padding: '18px',
        borderRadius: '20px', marginBottom: '14px',
      }}>
        <p style={{
          fontSize: '10px', fontWeight: 700, letterSpacing: '1.5px',
          color: 'rgba(255,255,255,0.6)', margin: '0 0 4px', textTransform: 'uppercase',
        }}>
          Total Balance
        </p>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '12px' }}>
          <h2 style={{
            fontSize: '26px', fontWeight: 800, margin: 0,
            fontFamily: 'Georgia, serif', letterSpacing: '-0.5px',
          }}>
            $42,950.00
          </h2>
          <div style={{
            background: 'rgba(255,255,255,0.12)', border: '0.5px solid rgba(255,255,255,0.2)',
            borderRadius: '8px', padding: '3px 8px', display: 'flex', alignItems: 'center',
            gap: '4px', fontSize: '11px', fontWeight: 700, color: '#4fe8a0',
          }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
              <polyline points="16 7 22 7 22 13" />
            </svg>
            +2.4%
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: '36px', marginBottom: '10px' }}>
          {chartBars.map((h, i) => (
            <div key={i} style={{
              flex: 1, height: `${h}%`,
              background: i === 3 ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.18)',
              borderRadius: '2px',
            }} />
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ fontSize: '9px', color: 'rgba(255,255,255,0.45)', margin: 0, letterSpacing: '1px', textTransform: 'uppercase' }}>Income</p>
            <p style={{ fontSize: '13px', fontWeight: 700, color: '#fff', margin: 0 }}>+$4,500</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '9px', color: 'rgba(255,255,255,0.45)', margin: 0, letterSpacing: '1px', textTransform: 'uppercase' }}>Expenses</p>
            <p style={{ fontSize: '13px', fontWeight: 700, color: '#fff', margin: 0 }}>-$1,550</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div style={{ marginBottom: '14px' }}>
        <p style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '1.5px', color: '#7a90b0', margin: '0 0 10px', textTransform: 'uppercase' }}>
          Quick Actions
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '8px' }}>
          {quickActions.map((action) => (
            <button
              key={action.label}
              onMouseDown={() => handleActionPress(action.label)}
              onTouchStart={() => handleActionPress(action.label)}
              onClick={() => router.push(action.route)}
              style={{
                background: pressedAction === action.label ? '#eaf0fb' : '#fff',
                border: '0.5px solid #dce3ef', padding: '14px 12px',
                borderRadius: '14px', cursor: 'pointer', display: 'flex',
                alignItems: 'center', gap: '10px',
                transform: pressedAction === action.label ? 'scale(0.94)' : 'scale(1)',
                transition: 'transform 0.15s ease, background 0.15s ease',
              }}
            >
              <span style={{ color: '#0D307F', flexShrink: 0 }} dangerouslySetInnerHTML={{ __html: action.svg }} />
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#0D307F' }}>{action.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div style={{ marginBottom: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <p style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '1.5px', color: '#7a90b0', margin: 0, textTransform: 'uppercase' }}>
            Recent Activity
          </p>
          <span style={{ fontSize: '11px', fontWeight: 700, color: '#0D307F', cursor: 'pointer' }}>View All</span>
        </div>
        {activities.map((item, i) => (
          <div key={i} style={{
            background: '#fff', padding: '12px', borderRadius: '14px',
            marginBottom: '8px', display: 'flex', alignItems: 'center',
            justifyContent: 'space-between', border: '0.5px solid #dce3ef',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '36px', height: '36px',
                  background: item.income ? '#e0f8ee' : '#eaf0fb',
                  borderRadius: '10px', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', color: item.income ? '#1D9E75' : '#0D307F', flexShrink: 0,
                }}
                dangerouslySetInnerHTML={{ __html: item.svg }}
              />
              <div>
                <p style={{ fontSize: '13px', fontWeight: 700, margin: 0, color: '#0a1a3a' }}>{item.name}</p>
                <p style={{ fontSize: '10px', color: '#8aa0bc', margin: 0 }}>{item.date}</p>
              </div>
            </div>
            <p style={{ fontSize: '13px', fontWeight: 800, margin: 0, color: item.neg ? '#0a1a3a' : '#1D9E75', flexShrink: 0 }}>
              {item.amount}
            </p>
          </div>
        ))}
      </div>
    </>
  )
}

export default DashboardPage