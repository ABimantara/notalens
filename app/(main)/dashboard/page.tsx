'use client'
import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useNav } from '@/app/components/AppLayout'
import { useTheme } from '@/context/ThemeContext'
import { fetchTransactions } from '@/lib/transactions-api'
import { formatRp, formatDisplayDate } from '@/lib/amount'

interface QuickAction {
  label: string; route: string; svg: string
}

const receiptSvg = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`

const DashboardPage: React.FC = () => {
  const { setActiveNav } = useNav()
  const router = useRouter()
  const { darkMode } = useTheme()
  const [pressedAction, setPressedAction] = useState<string | null>(null)
  const [user, setUser] = useState<{ name?: string }>({})
  const [activities, setActivities] = useState<Array<{
    id: number
    name: string
    date: string
    amount: string
    transactionDate: string
  }>>([])
  const [monthExpenses, setMonthExpenses] = useState(0)
  const [loadingTx, setLoadingTx] = useState(true)

  useEffect(() => {
    setActiveNav('HOME')
    const stored = localStorage.getItem('user')
    if (stored) setUser(JSON.parse(stored))

    const load = async () => {
      const now = new Date()
      const [recent, month] = await Promise.all([
        fetchTransactions({ limit: 5 }),
        fetchTransactions({
          month: now.getMonth() + 1,
          year: now.getFullYear(),
        }),
      ])

      if (recent?.transactions.length) {
        setActivities(
          recent.transactions.map((tx) => ({
            id: tx.transaction_id,
            name: tx.merchant_name || 'Transaksi',
            date: formatDisplayDate(tx.transaction_date),
            amount: `-${formatRp(Number(tx.total_amount))}`,
            transactionDate: tx.transaction_date,
          }))
        )
      } else {
        setActivities([])
      }

      if (month) setMonthExpenses(month.summary.total_expenses)
      setLoadingTx(false)
    }

    load()
  }, [setActiveNav])

  const bg = darkMode ? '#0f172a' : '#f4f7fb'
  const cardBg = darkMode ? '#1e293b' : '#fff'
  const textPrimary = darkMode ? '#f1f5f9' : '#0a1a3a'
  const textSecondary = darkMode ? '#94a3b8' : '#7a90b0'
  const borderColor = darkMode ? '#334155' : '#dce3ef'
  const actionText = darkMode ? '#e2e8f0' : '#0D307F'
  const actionIcon = darkMode ? '#7aa5f5' : '#0D307F'

  const handleActionPress = (label: string) => {
    setPressedAction(label)
    setTimeout(() => setPressedAction(null), 180)
  }

  function getGreeting() {
    const hour = new Date().getHours()
    if (hour >= 5 && hour < 12) return 'Selamat Pagi'
    if (hour >= 12 && hour < 18) return 'Selamat Siang'
    if (hour >= 18 && hour < 22) return 'Selamat Sore'
    return 'Selamat Malam'
  }

  const quickActions: QuickAction[] = [
    { label: 'Scan', route: '/scan', svg: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M3 7V5a2 2 0 0 1 2-2h2m10 0h2a2 2 0 0 1 2 2v2m0 10v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2"></path><rect x="7" y="7" width="3" height="3" fill="currentColor"></rect><rect x="14" y="7" width="3" height="3" fill="currentColor"></rect><rect x="7" y="14" width="3" height="3" fill="currentColor"></rect><rect x="14" y="14" width="3" height="3" fill="currentColor"></rect></svg>` },
    { label: 'Workspace', route: '/workspace', svg: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>` },
    { label: 'Recap', route: '/recap', svg: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><path d="M16 13H8"></path><path d="M16 17H8"></path><path d="M10 9H8"></path></svg>` },
    { label: 'Settings', route: '/settings', svg: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>` },
  ]

  const chartBars = [35, 60, 42, 85, 58, 75, 48]

  return (
    <div style={{ background: bg, minHeight: '100%', transition: 'background 0.3s' }}>

      <div style={{ marginBottom: '14px' }}>
        <p style={{ fontSize: '11px', color: textSecondary, margin: '0 0 2px', fontWeight: 500 }}>
          {getGreeting()}
        </p>
        <h1 style={{ fontSize: '21px', fontWeight: 800, color: textPrimary, margin: 0, fontFamily: 'Georgia, serif', letterSpacing: '-0.5px' }}>
          Halo, {user.name || 'kamu'}! 👋
        </h1>
      </div>

      <div style={{ background: '#0D307F', color: '#fff', padding: '18px', borderRadius: '20px', marginBottom: '14px' }}>
        <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '1.5px', color: 'rgba(255,255,255,0.6)', margin: '0 0 4px', textTransform: 'uppercase' }}>
          Pengeluaran Bulan Ini
        </p>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '12px' }}>
          <h2 style={{ fontSize: '26px', fontWeight: 800, margin: 0, fontFamily: 'Georgia, serif' }}>
            {loadingTx ? '...' : formatRp(monthExpenses)}
          </h2>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: '36px', marginBottom: '10px' }}>
          {chartBars.map((h, i) => (
            <div key={i} style={{ flex: 1, height: `${h}%`, background: i === 3 ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.18)', borderRadius: '2px' }} />
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <div>
            <p style={{ fontSize: '9px', color: 'rgba(255,255,255,0.45)', margin: 0, letterSpacing: '1px', textTransform: 'uppercase' }}>Transaksi</p>
            <p style={{ fontSize: '13px', fontWeight: 700, color: '#fff', margin: 0 }}>{activities.length} terbaru</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '9px', color: 'rgba(255,255,255,0.45)', margin: 0, letterSpacing: '1px', textTransform: 'uppercase' }}>Pengeluaran</p>
            <p style={{ fontSize: '13px', fontWeight: 700, color: '#fff', margin: 0 }}>
              {loadingTx ? '...' : `-${formatRp(monthExpenses)}`}
            </p>
          </div>
        </div>
      </div>

      <div style={{ marginBottom: '14px' }}>
        <p style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '1.5px', color: textSecondary, margin: '0 0 10px', textTransform: 'uppercase' }}>
          Aksi Cepat
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '8px' }}>
          {quickActions.map((action) => (
            <button key={action.label}
              onMouseDown={() => handleActionPress(action.label)}
              onTouchStart={() => handleActionPress(action.label)}
              onClick={() => router.push(action.route)}
              style={{
                background: pressedAction === action.label ? (darkMode ? '#2d3f5c' : '#eaf0fb') : cardBg,
                border: `0.5px solid ${borderColor}`, padding: '14px 12px',
                borderRadius: '14px', cursor: 'pointer', display: 'flex',
                alignItems: 'center', gap: '10px',
                transform: pressedAction === action.label ? 'scale(0.94)' : 'scale(1)',
                transition: 'transform 0.15s ease, background 0.15s ease',
              }}>
              <span style={{ color: actionIcon, flexShrink: 0 }} dangerouslySetInnerHTML={{ __html: action.svg }} />
              <span style={{ fontSize: '12px', fontWeight: 700, color: actionText }}>{action.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <p style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '1.5px', color: textSecondary, margin: 0, textTransform: 'uppercase' }}>
            Aktivitas Terbaru
          </p>
          <span onClick={() => router.push('/recap')} style={{ fontSize: '11px', fontWeight: 700, color: darkMode ? '#7aa5f5' : '#0D307F', cursor: 'pointer' }}>Lihat Semua</span>
        </div>
        {loadingTx ? (
          <p style={{ fontSize: '12px', color: textSecondary }}>Memuat transaksi...</p>
        ) : activities.length === 0 ? (
          <div style={{
            background: cardBg, padding: '16px', borderRadius: '14px',
            border: `0.5px solid ${borderColor}`, textAlign: 'center',
          }}>
            <p style={{ fontSize: '12px', color: textSecondary, margin: 0 }}>Belum ada transaksi. Scan struk untuk mulai.</p>
          </div>
        ) : (
          activities.map((item, i) => (
            <div key={i}
              onClick={() => router.push(`/recap/transaction/${item.id}`)}
              style={{
                background: cardBg, padding: '12px', borderRadius: '14px',
                marginBottom: '8px', display: 'flex', alignItems: 'center',
                justifyContent: 'space-between', border: `0.5px solid ${borderColor}`,
                cursor: 'pointer',
              }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '36px', height: '36px',
                  background: darkMode ? '#1e3a5f' : '#eaf0fb',
                  borderRadius: '10px', display: 'flex', alignItems: 'center',
                  justifyContent: 'center',
                  color: darkMode ? '#7aa5f5' : '#0D307F',
                  flexShrink: 0,
                }} dangerouslySetInnerHTML={{ __html: receiptSvg }} />
                <div>
                  <p style={{ fontSize: '13px', fontWeight: 700, margin: 0, color: textPrimary }}>{item.name}</p>
                  <p style={{ fontSize: '10px', color: textSecondary, margin: 0 }}>{item.date}</p>
                </div>
              </div>
              <p style={{ fontSize: '13px', fontWeight: 800, margin: 0, color: textPrimary, flexShrink: 0 }}>
                {item.amount}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default DashboardPage
