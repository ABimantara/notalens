'use client'
import React, { useState, useEffect, createContext, useContext } from 'react'
import Image from 'next/image'
import { useRouter, usePathname } from 'next/navigation'

// ─── Nav Context ──────────────────────────────────────────────────────────────
interface NavContextType {
  activeNav: string
  setActiveNav: (label: string) => void
  headerSlot: React.ReactNode
  setHeaderSlot: (slot: React.ReactNode) => void
  fullBleed: boolean
  setFullBleed: (v: boolean) => void
}

export const NavContext = createContext<NavContextType>({
  activeNav: 'HOME',
  setActiveNav: () => {},
  headerSlot: null,
  setHeaderSlot: () => {},
  fullBleed: false,
  setFullBleed: () => {},
})

export const useNav = () => useContext(NavContext)

// ─── Nav Config ───────────────────────────────────────────────────────────────
const NAV_ROUTES: Record<string, string> = {
  HOME: '/dashboard',
  RECAP: '/recap',
  SCAN: '/scan',
  WORKSPACE: '/workspace',
  SETTINGS: '/settings',
}

const NAV_ITEMS = [
  {
    label: 'HOME',
    svg: `<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>`,
  },
  {
    label: 'RECAP',
    svg: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M16 13H8"/><path d="M16 17H8"/><path d="M10 9H8"/></svg>`,
  },
  {
    label: 'SCAN',
    svg: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M3 7V5a2 2 0 0 1 2-2h2m10 0h2a2 2 0 0 1 2 2v2m0 10v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2"/><rect x="7" y="7" width="3" height="3" fill="currentColor"/><rect x="14" y="7" width="3" height="3" fill="currentColor"/><rect x="7" y="14" width="3" height="3" fill="currentColor"/><rect x="14" y="14" width="3" height="3" fill="currentColor"/></svg>`,
  },
  {
    label: 'WORKSPACE',
    svg: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/><path d="M12 11h.01"/></svg>`,
  },
  {
    label: 'SETTINGS',
    svg: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
  },
]

// ─── Header ───────────────────────────────────────────────────────────────────
interface HeaderProps {
  rightSlot?: React.ReactNode
  bgColor?: string
}

export const AppHeader: React.FC<HeaderProps> = ({ rightSlot, bgColor = '#f0f4fa' }) => {
  const [user, setUser] = useState<{ name?: string }>({})
  const { headerSlot } = useNav()

  useEffect(() => {
    const stored = localStorage.getItem('user')
    if (stored) setUser(JSON.parse(stored))
  }, [])

  const defaultRight = (
    <div style={{
      width: '32px', height: '32px', borderRadius: '50%',
      background: '#0D307F', display: 'flex', alignItems: 'center',
      justifyContent: 'center', fontSize: '13px', fontWeight: 700, color: '#fff',
    }}>
      {user.name?.charAt(0).toUpperCase() || 'U'}
    </div>
  )

  const right = headerSlot ?? rightSlot ?? defaultRight

  return (
    <header style={{
      flexShrink: 0, padding: '32px 18px 12px',
      background: bgColor, borderBottom: '0.5px solid #dce3ef', zIndex: 40,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
          <Image src="/logo.png" alt="NotaLens" width={28} height={28}
            style={{ borderRadius: '8px', objectFit: 'cover' }} />
          <span style={{
            fontSize: '14px', fontWeight: 800, letterSpacing: '1px',
            color: '#0D307F', fontFamily: 'Georgia, serif',
          }}>NotaLens</span>
        </div>
        {right}
      </div>
    </header>
  )
}

// ─── Navbar ───────────────────────────────────────────────────────────────────
export const AppNavbar: React.FC = () => {
  const { activeNav, setActiveNav } = useNav()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const current = NAV_ITEMS.find(item => NAV_ROUTES[item.label] === pathname)
    if (current) setActiveNav(current.label)
  }, [pathname])

  return (
    <nav style={{
      flexShrink: 0, background: '#fff', borderTop: '0.5px solid #dce3ef',
      display: 'flex', justifyContent: 'space-around', alignItems: 'center',
      padding: '8px 6px 18px', zIndex: 40,
    }}>
      {NAV_ITEMS.map((item) => {
        const isActive = activeNav === item.label
        return (
          <button
            key={item.label}
            onClick={() => {
              setActiveNav(item.label)
              router.push(NAV_ROUTES[item.label])
            }}
            style={{
              flex: 1, border: 'none', background: 'transparent',
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: '3px', cursor: 'pointer', padding: 0,
            }}
          >
            <div
              style={{
                width: '38px', height: '30px', display: 'flex',
                alignItems: 'center', justifyContent: 'center', borderRadius: '10px',
                background: isActive ? '#eaf0fb' : 'transparent',
                color: isActive ? '#0D307F' : '#b0bdd0',
                transition: 'background 0.2s ease, color 0.2s ease',
              }}
              dangerouslySetInnerHTML={{ __html: item.svg }}
            />
            <span style={{
              fontSize: '9px', fontWeight: isActive ? 800 : 500,
              color: isActive ? '#0D307F' : '#b0bdd0',
              textTransform: 'uppercase', letterSpacing: '0.5px',
              transition: 'color 0.2s ease',
            }}>
              {item.label}
            </span>
          </button>
        )
      })}
    </nav>
  )
}

// ─── Phone Layout ─────────────────────────────────────────────────────────────
// VERSI 1: Lebar terbatas max 430px, centered di layar
// Cocok untuk preview di desktop tapi tetap terasa mobile
interface PhoneLayoutProps {
  children: React.ReactNode
  headerProps?: HeaderProps
  screenBg?: string
}

export const PhoneLayout: React.FC<PhoneLayoutProps> = ({
  children,
  headerProps,
  screenBg = '#f0f4fa',
}) => {
  const { fullBleed } = useNav()

  return (
    // Outer: background netral, centered secara horizontal
    <div style={{
      minHeight: '100vh',
      background: '#e8edf5',
      display: 'flex',
      justifyContent: 'center',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    }}>
      {/* Inner: max 430px, full height, tampilan mobile */}
      <div style={{
        width: '100%',
        maxWidth: '430px',
        minHeight: '100vh',
        background: screenBg,
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 0 40px rgba(0,0,0,0.12)',
      }}>
        <AppHeader {...headerProps} />

        {fullBleed ? (
          <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
            {children}
          </div>
        ) : (
          <div style={{
            flex: 1, overflowY: 'auto', padding: '14px 14px 8px',
            scrollbarWidth: 'none', msOverflowStyle: 'none',
          } as React.CSSProperties}>
            <style>{`div::-webkit-scrollbar { display: none; }`}</style>
            {children}
          </div>
        )}

        <AppNavbar />
      </div>
    </div>
  )
}

// ─── App Layout (Provider) ────────────────────────────────────────────────────
interface AppLayoutProps {
  children: React.ReactNode
  defaultNav?: string
}

const AppLayout: React.FC<AppLayoutProps> = ({ children, defaultNav = 'HOME' }) => {
  const [activeNav, setActiveNav] = useState(defaultNav)
  const [headerSlot, setHeaderSlot] = useState<React.ReactNode>(null)
  const [fullBleed, setFullBleed] = useState(false)

  return (
    <NavContext.Provider value={{
      activeNav, setActiveNav,
      headerSlot, setHeaderSlot,
      fullBleed, setFullBleed,
    }}>
      <PhoneLayout>
        {children}
      </PhoneLayout>
    </NavContext.Provider>
  )
}

export default AppLayout