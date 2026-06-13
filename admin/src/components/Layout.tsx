import { useState, type CSSProperties, type ReactNode } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAdminContext } from '../lib/AdminContext'

const COLORS = {
  sidebar: '#1a0a2e',
  navbar: '#2d1052',
  mainBg: '#f5f5f5',
  accentRed: '#e53935',
  activeNavBorder: '#e91e8c',
} as const

function IconChevron({ open }: { open: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden
      style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }}>
      <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconHamburger() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

type LayoutProps = { children: ReactNode }

export default function Layout({ children }: LayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [retailerOpen, setRetailerOpen] = useState(false)
  const [subAdminOpen, setSubAdminOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { adminProfile, isSuperAdmin, signOut } = useAdminContext()

  const sidebarWidth = sidebarCollapsed ? 60 : 240
  const labelFont: CSSProperties = { fontFamily: "'Inter', sans-serif" }

  const navItemBase: CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
    color: '#fff', cursor: 'pointer', fontSize: 14, borderLeft: '3px solid transparent',
    userSelect: 'none', transition: 'background 0.15s ease',
  }

  function isActive(path: string) {
    return location.pathname === path || location.pathname.startsWith(path + '/')
  }

  function navItem(path: string, label: string, icon: string) {
    const active = isActive(path)
    return (
      <div key={path} onClick={() => navigate(path)}
        style={{ ...navItemBase, ...(active ? { background: 'rgba(233, 30, 140, 0.12)', borderLeft: `3px solid ${COLORS.activeNavBorder}` } : {}) }}
        onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.06)' }}
        onMouseLeave={(e) => { if (!active) (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}
      >
        <span style={{ fontSize: 18 }}>{icon}</span>
        {!sidebarCollapsed && <span>{label}</span>}
      </div>
    )
  }

  const retailerPaths = [
    { path: '/retailer/create', label: 'Create User' },
    { path: '/retailer/list', label: 'List Users' },
    { path: '/retailer/debit-credit', label: 'Debit / Credit' },
  ]

  const subAdminPaths = [
    { path: '/subadmin/list', label: 'List Sub-Admins' },
    { path: '/subadmin/create', label: 'Create Sub-Admin' },
  ]

  const retailerActive = retailerPaths.some((p) => isActive(p.path))
  const subAdminActive = subAdminPaths.some((p) => isActive(p.path))

  function accordion(
    icon: string,
    label: string,
    isOpen: boolean,
    toggle: () => void,
    isGroupActive: boolean,
    items: { path: string; label: string }[],
  ) {
    return (
      <>
        <div onClick={() => !sidebarCollapsed && toggle()}
          style={{ ...navItemBase, ...((isGroupActive && !isOpen) ? { background: 'rgba(233, 30, 140, 0.12)', borderLeft: `3px solid ${COLORS.activeNavBorder}` } : {}) }}
          onMouseEnter={(e) => { if (!isGroupActive || isOpen) (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.06)' }}
          onMouseLeave={(e) => { if (!isGroupActive || isOpen) (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}
        >
          <span style={{ fontSize: 18 }}>{icon}</span>
          {!sidebarCollapsed && (
            <>
              <span style={{ flex: 1 }}>{label}</span>
              <IconChevron open={isOpen} />
            </>
          )}
        </div>
        {!sidebarCollapsed && isOpen && (
          <div style={{ background: 'rgba(0,0,0,0.15)', overflow: 'hidden' }}>
            {items.map((item) => {
              const active = isActive(item.path)
              return (
                <div key={item.path}
                  onClick={(e) => { e.stopPropagation(); navigate(item.path) }}
                  style={{ padding: '9px 14px 9px 48px', fontSize: 13, color: active ? '#fff' : 'rgba(255,255,255,0.78)', cursor: 'pointer', background: active ? 'rgba(233, 30, 140, 0.15)' : 'transparent', borderLeft: active ? `3px solid ${COLORS.activeNavBorder}` : '3px solid transparent', transition: 'background 0.15s ease' }}
                  onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.06)' }}
                  onMouseLeave={(e) => { if (!active) (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}
                >
                  {item.label}
                </div>
              )
            })}
          </div>
        )}
      </>
    )
  }

  async function handleLogout() {
    await signOut()
    navigate('/signin')
  }

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; }
        html, body, #root { height: 100%; margin: 0; }
        body { font-family: 'Inter', sans-serif; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.18); border-radius: 3px; }
      `}</style>

      <div style={{ display: 'flex', minHeight: '100vh', background: COLORS.mainBg }}>
        {/* Sidebar */}
        <aside style={{ width: sidebarWidth, flexShrink: 0, background: COLORS.sidebar, color: '#fff', display: 'flex', flexDirection: 'column', transition: 'width 0.2s ease', overflow: 'hidden' }}>
          {/* Logo */}
          <div style={{ padding: sidebarCollapsed ? '16px 8px' : '20px 16px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <img src="/logo.png" alt="J.P Logo" style={{ width: 44, height: 44, minWidth: 44, borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(255,255,255,0.25)' }} />
            {!sidebarCollapsed && (
              <div style={{ fontWeight: 900, fontStyle: 'italic', color: COLORS.accentRed, fontSize: 18, lineHeight: 1.15, whiteSpace: 'nowrap' }}>
                J.P
              </div>
            )}
          </div>

          {/* Nav items */}
          <nav style={{ flex: 1, overflowY: 'auto', paddingBottom: 24, paddingTop: 8 }}>
            {navItem('/dashboard', 'Dashboard', '📊')}
            {accordion('🏪', 'Retailer', retailerOpen, () => setRetailerOpen((o) => !o), retailerActive, retailerPaths)}
            {isSuperAdmin && accordion('👤', 'Sub-Admin', subAdminOpen, () => setSubAdminOpen((o) => !o), subAdminActive, subAdminPaths)}
            {navItem('/transactions', 'Transaction History', '🧾')}
          </nav>
        </aside>

        {/* Main column */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          {/* Top navbar */}
          <header style={{ height: 56, background: COLORS.navbar, color: '#fff', display: 'flex', alignItems: 'center', paddingLeft: 12, paddingRight: 16, gap: 16, borderBottom: '1px solid rgba(0,0,0,0.2)' }}>
            <button type="button" onClick={() => setSidebarCollapsed((c) => !c)} aria-label="Toggle sidebar" style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', padding: 8, display: 'flex', alignItems: 'center' }}>
              <IconHamburger />
            </button>
            <div style={{ flex: 1 }} />
            {adminProfile && !sidebarCollapsed && (
              <span style={{ ...labelFont, fontSize: 13, opacity: 0.85, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {adminProfile.display_name || adminProfile.username}
                {adminProfile.role === 'sub_admin' && <span style={{ marginLeft: 6, fontSize: 11, background: 'rgba(255,255,255,0.15)', padding: '2px 6px', borderRadius: 10 }}>Sub-Admin</span>}
              </span>
            )}
            <button type="button" onClick={handleLogout} style={{ ...labelFont, background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontSize: 13 }}>
              Logout
            </button>
          </header>

          {/* Page content */}
          <main style={{ flex: 1, padding: 24, overflow: 'auto' }}>
            {children}
          </main>
        </div>
      </div>
    </>
  )
}
