import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
} from 'react'

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

type GameType = '2D' | '3D' | '12D'

type RetailerRow = {
  id: number
  name: string
  accountCode: string
  salePt2D: number
  salePt3D: number
  salePt12D: number
  claim2D: number
  claim3D: number
  claim12D: number
  win2D: number
  win3D: number
  win12D: number
  commi2D: number
  commi3D: number
  commi12D: number
  netPt2D: number
  netPt3D: number
  netPt12D: number
  winPct: number
}

type DashboardTotals = Omit<RetailerRow, 'id' | 'name' | 'accountCode' | 'winPct'>

type PageSize = 10 | 25 | 50 | 100

type DashboardState = {
  availablePoints: number
  fromDate: string
  toDate: string
  searchQuery: string
  pageSize: PageSize
  currentPage: number
  retailers: RetailerRow[]
  totals: DashboardTotals
}

type SortDirection = 'asc' | 'desc'

type SortKey = keyof RetailerRow

/* -------------------------------------------------------------------------- */
/* Constants & helpers                                                        */
/* -------------------------------------------------------------------------- */

const GAME_TYPES: GameType[] = ['2D', '3D', '12D']

const COLORS = {
  sidebar: '#1a0a2e',
  navbar: '#2d1052',
  mainBg: '#f5f5f5',
  tableBorder: '#e0e0e0',
  headerBg: '#2c2c3e',
  totalsBg: '#fffde7',
  rowAlt: '#fafafa',
  accentRed: '#e53935',
  searchGreen: '#43a047',
  homeOrange: '#ef5350',
  activeNavBorder: '#e91e8c',
  mutedArrow: '#9e9e9e',
  activeSort: '#e91e8c',
  pillBlue: '#1976d2',
} as const

function formatMoney(n: number): string {
  const fixed = Number(n.toFixed(2))
  return fixed.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function buildRow(
  base: Omit<
    RetailerRow,
    'netPt2D' | 'netPt3D' | 'netPt12D' | 'winPct'
  >,
): RetailerRow {
  const netPt2D = base.salePt2D - base.win2D - base.commi2D
  const netPt3D = base.salePt3D - base.win3D - base.commi3D
  const netPt12D = base.salePt12D - base.win12D - base.commi12D
  const saleSum = base.salePt2D + base.salePt3D + base.salePt12D
  const winSum = base.win2D + base.win3D + base.win12D
  const winPct = saleSum > 0 ? (winSum / saleSum) * 100 : 0
  return {
    ...base,
    netPt2D,
    netPt3D,
    netPt12D,
    winPct,
  }
}

function sumTotals(rows: RetailerRow[]): DashboardTotals {
  const z = {
    salePt2D: 0,
    salePt3D: 0,
    salePt12D: 0,
    claim2D: 0,
    claim3D: 0,
    claim12D: 0,
    win2D: 0,
    win3D: 0,
    win12D: 0,
    commi2D: 0,
    commi3D: 0,
    commi12D: 0,
    netPt2D: 0,
    netPt3D: 0,
    netPt12D: 0,
  }
  for (const r of rows) {
    z.salePt2D += r.salePt2D
    z.salePt3D += r.salePt3D
    z.salePt12D += r.salePt12D
    z.claim2D += r.claim2D
    z.claim3D += r.claim3D
    z.claim12D += r.claim12D
    z.win2D += r.win2D
    z.win3D += r.win3D
    z.win12D += r.win12D
    z.commi2D += r.commi2D
    z.commi3D += r.commi3D
    z.commi12D += r.commi12D
    z.netPt2D += r.netPt2D
    z.netPt3D += r.netPt3D
    z.netPt12D += r.netPt12D
  }
  return z
}

const MOCK_RETAILERS_RAW: Omit<
  RetailerRow,
  'netPt2D' | 'netPt3D' | 'netPt12D' | 'winPct'
>[] = [
  {
    id: 1,
    name: 'Alliance Point - 100001',
    accountCode: '100001',
    salePt2D: 0,
    salePt3D: 0,
    salePt12D: 0,
    claim2D: 0,
    claim3D: 0,
    claim12D: 0,
    win2D: 0,
    win3D: 0,
    win12D: 0,
    commi2D: 0,
    commi3D: 0,
    commi12D: 0,
  },
  {
    id: 2,
    name: 'Khatushyam 207504 - 207504',
    accountCode: '207504',
    salePt2D: 2660,
    salePt3D: 7270,
    salePt12D: 0,
    claim2D: 2700,
    claim3D: 8700,
    claim12D: 0,
    win2D: 2700,
    win3D: 8700,
    win12D: 0,
    commi2D: 239.4,
    commi3D: 654.3,
    commi12D: 0,
  },
  {
    id: 3,
    name: 'Mahendra singh 2 - 634193',
    accountCode: '634193',
    salePt2D: 120,
    salePt3D: 13200,
    salePt12D: 0,
    claim2D: 0,
    claim3D: 0,
    claim12D: 0,
    win2D: 0,
    win3D: 34500,
    win12D: 0,
    commi2D: 10.8,
    commi3D: 1188,
    commi12D: 0,
  },
]

const MOCK_RETAILERS: RetailerRow[] = MOCK_RETAILERS_RAW.map(buildRow)

function todayISO(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function getInitialDashboardState(): DashboardState {
  return {
    availablePoints: 262800,
    fromDate: todayISO(),
    toDate: todayISO(),
    searchQuery: '',
    pageSize: 10,
    currentPage: 1,
    retailers: MOCK_RETAILERS.map((r) => buildRow({ ...r })),
    totals: sumTotals(MOCK_RETAILERS),
  }
}

/* -------------------------------------------------------------------------- */
/* Small inline SVG icons                                                     */
/* -------------------------------------------------------------------------- */

function IconHamburger() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 6h16M4 12h16M4 18h16"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}

function IconSearch() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
      <path
        d="M20 20l-4-4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}

function IconEye() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
    </svg>
  )
}

function IconChevron({ open }: { open: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      style={{
        transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
        transition: 'transform 0.2s ease',
      }}
    >
      <path
        d="M6 9l6 6 6-6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/* -------------------------------------------------------------------------- */
/* App                                                                        */
/* -------------------------------------------------------------------------- */

export default function App() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [navOpen, setNavOpen] = useState<Record<string, boolean>>({
    retailer: false,
    masterReport: false,
    playReport: false,
    transactionHistory: false,
    report: false,
  })
  const [dashboard, setDashboard] = useState<DashboardState>(() =>
    getInitialDashboardState(),
  )
  const [sortKey, setSortKey] = useState<SortKey>('id')
  const [sortDir, setSortDir] = useState<SortDirection>('asc')
  const [filterFrom, setFilterFrom] = useState(() => todayISO())
  const [filterTo, setFilterTo] = useState(() => todayISO())

  useEffect(() => {
    const linkId = 'silver-coin-google-fonts'
    if (document.getElementById(linkId)) return
    const link = document.createElement('link')
    link.id = linkId
    link.rel = 'stylesheet'
    link.href =
      'https://fonts.googleapis.com/css2?family=Inter:ital,wght@0,400;0,600;0,700;1,700&family=JetBrains+Mono:wght@400;500;600&display=swap'
    document.head.appendChild(link)
  }, [])

  const sidebarWidth = sidebarCollapsed ? 60 : 220

  const filteredRetailers = useMemo(() => {
    const q = dashboard.searchQuery.trim().toLowerCase()
    if (!q) return dashboard.retailers
    return dashboard.retailers.filter((r) =>
      r.name.toLowerCase().includes(q),
    )
  }, [dashboard.retailers, dashboard.searchQuery])

  const maxPage = Math.max(
    1,
    Math.ceil(filteredRetailers.length / dashboard.pageSize),
  )

  useEffect(() => {
    if (dashboard.currentPage > maxPage) {
      setDashboard((d) => ({ ...d, currentPage: maxPage }))
    }
  }, [maxPage, dashboard.currentPage])

  const sortedRetailers = useMemo(() => {
    const dir = sortDir === 'asc' ? 1 : -1
    const key = sortKey
    return [...filteredRetailers].sort((a, b) => {
      const av = a[key]
      const bv = b[key]
      if (typeof av === 'number' && typeof bv === 'number') {
        return (av - bv) * dir
      }
      return String(av).localeCompare(String(bv), undefined, {
        numeric: true,
      }) * dir
    })
  }, [filteredRetailers, sortKey, sortDir])

  const totalsForView = useMemo(
    () => sumTotals(filteredRetailers),
    [filteredRetailers],
  )

  const totalPages = Math.max(
    1,
    Math.ceil(sortedRetailers.length / dashboard.pageSize),
  )
  const safePage = Math.min(dashboard.currentPage, totalPages)
  const pageStart = (safePage - 1) * dashboard.pageSize
  const pageRows = sortedRetailers.slice(
    pageStart,
    pageStart + dashboard.pageSize,
  )

  const showingFrom =
    sortedRetailers.length === 0 ? 0 : pageStart + 1
  const showingTo = Math.min(
    pageStart + dashboard.pageSize,
    sortedRetailers.length,
  )

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  function renderSortArrows(key: SortKey) {
    const active = sortKey === key
    const up =
      active && sortDir === 'asc' ? COLORS.activeSort : COLORS.mutedArrow
    const down =
      active && sortDir === 'desc' ? COLORS.activeSort : COLORS.mutedArrow
    return (
      <span style={{ marginLeft: 4, fontSize: 10, userSelect: 'none' }}>
        <span style={{ color: up }}>↑</span>
        <span style={{ color: down }}>↓</span>
      </span>
    )
  }

  const mono: CSSProperties = {
    fontFamily: "'JetBrains Mono', monospace",
  }
  const labelFont: CSSProperties = { fontFamily: "'Inter', sans-serif" }

  function headerCell(
    key: SortKey,
    label: string,
    rowSpan?: number,
    colSpan?: number,
    extraStyle?: CSSProperties,
  ) {
    return (
      <th
        rowSpan={rowSpan}
        colSpan={colSpan}
        onClick={() => toggleSort(key)}
        style={{
          padding: '8px 10px',
          textAlign: 'left',
          whiteSpace: 'nowrap',
          cursor: 'pointer',
          borderBottom: `1px solid ${COLORS.tableBorder}`,
          ...extraStyle,
        }}
      >
        <span style={labelFont}>{label}</span>
        {renderSortArrows(key)}
      </th>
    )
  }

  function toggleNav(key: string) {
    setNavOpen((o) => ({ ...o, [key]: !o[key] }))
  }

  function handleLogout() {
    setDashboard(getInitialDashboardState())
    setFilterFrom(todayISO())
    setFilterTo(todayISO())
    setSortKey('id')
    setSortDir('asc')
    window.alert('Logged out')
  }

  function handleFilterSearch() {
    setDashboard((d) => ({
      ...d,
      fromDate: filterFrom,
      toDate: filterTo,
      retailers: MOCK_RETAILERS.map((r) => buildRow({ ...r })),
      totals: sumTotals(MOCK_RETAILERS),
      currentPage: 1,
    }))
  }

  const navItemBase: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '10px 14px',
    color: '#fff',
    cursor: 'pointer',
    fontSize: 14,
    borderLeft: '3px solid transparent',
  }

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; }
        html, body, #root { height: 100%; margin: 0; }
        body { font-family: 'Inter', sans-serif; }
      `}</style>

      <div style={{ display: 'flex', minHeight: '100vh', background: COLORS.mainBg }}>
        {/* Sidebar */}
        <aside
          style={{
            width: sidebarWidth,
            flexShrink: 0,
            background: COLORS.sidebar,
            color: '#fff',
            display: 'flex',
            flexDirection: 'column',
            transition: 'width 0.2s ease',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: sidebarCollapsed ? '16px 8px' : '20px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              borderBottom: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <img
              src="/logo.png"
              alt="J.P Logo"
              style={{
                width: 44,
                height: 44,
                minWidth: 44,
                borderRadius: '50%',
                objectFit: 'cover',
                border: '2px solid rgba(255,255,255,0.25)',
              }}
            />
            {!sidebarCollapsed && (
              <div
                style={{
                  fontWeight: 900,
                  fontStyle: 'italic',
                  color: COLORS.accentRed,
                  fontSize: 18,
                  lineHeight: 1.15,
                  whiteSpace: 'nowrap',
                }}
              >
                J.P
              </div>
            )}
          </div>

          <div style={{ padding: sidebarCollapsed ? 8 : '12px 14px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: 'rgba(255,255,255,0.08)',
                borderRadius: 8,
                padding: '8px 10px',
              }}
            >
              <IconSearch />
              {!sidebarCollapsed && (
                <input
                  type="search"
                  placeholder="Search menu..."
                  aria-label="Sidebar search"
                  style={{
                    flex: 1,
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    color: '#fff',
                    fontSize: 13,
                  }}
                />
              )}
            </div>
          </div>

          <nav style={{ flex: 1, overflowY: 'auto', paddingBottom: 24 }}>
            <div
              style={{
                ...navItemBase,
                background: 'rgba(233, 30, 140, 0.12)',
                borderLeft: `3px solid ${COLORS.activeNavBorder}`,
              }}
            >
              <span>📊</span>
              {!sidebarCollapsed && <span>Dashboard</span>}
            </div>

            <div
              onClick={() => !sidebarCollapsed && toggleNav('retailer')}
              style={navItemBase}
            >
              <span>🏪</span>
              {!sidebarCollapsed && (
                <>
                  <span style={{ flex: 1 }}>Retailer</span>
                  <IconChevron open={!!navOpen.retailer} />
                </>
              )}
            </div>
            {!sidebarCollapsed && navOpen.retailer && (
              <div style={{ paddingLeft: 20, background: 'rgba(0,0,0,0.15)' }}>
                {['List', 'Add', 'Manage Point'].map((t) => (
                  <div
                    key={t}
                    style={{
                      padding: '8px 14px 8px 24px',
                      fontSize: 13,
                      color: 'rgba(255,255,255,0.85)',
                      cursor: 'pointer',
                    }}
                  >
                    {t}
                  </div>
                ))}
              </div>
            )}

            {(
              [
                ['masterReport', 'Master Report', '📑'],
                ['playReport', 'Play Report', '🎮'],
                ['transactionHistory', 'Transaction History', '🧾'],
                ['report', 'Report', '📈'],
              ] as const
            ).map(([key, label, icon]) => (
              <div key={key}>
                <div
                  onClick={() => !sidebarCollapsed && toggleNav(key)}
                  style={navItemBase}
                >
                  <span>{icon}</span>
                  {!sidebarCollapsed && (
                    <>
                      <span style={{ flex: 1 }}>{label}</span>
                      <IconChevron open={!!navOpen[key]} />
                    </>
                  )}
                </div>
                {!sidebarCollapsed && navOpen[key] && (
                  <div
                    style={{
                      paddingLeft: 20,
                      background: 'rgba(0,0,0,0.12)',
                      fontSize: 13,
                      color: 'rgba(255,255,255,0.8)',
                      padding: '8px 14px 8px 40px',
                    }}
                  >
                    (sub-items)
                  </div>
                )}
              </div>
            ))}

            <div style={navItemBase}>
              <span>📡</span>
              {!sidebarCollapsed && <span>Live Player</span>}
            </div>
          </nav>
        </aside>

        {/* Main column */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          {/* Top navbar */}
          <header
            style={{
              height: 56,
              background: COLORS.navbar,
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              paddingLeft: 12,
              paddingRight: 16,
              gap: 16,
              borderBottom: '1px solid rgba(0,0,0,0.2)',
            }}
          >
            <button
              type="button"
              onClick={() => setSidebarCollapsed((c) => !c)}
              aria-label="Toggle sidebar"
              style={{
                background: 'transparent',
                border: 'none',
                color: '#fff',
                cursor: 'pointer',
                padding: 8,
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <IconHamburger />
            </button>
            <div style={{ flex: 1 }} />
            <span style={{ ...labelFont, fontSize: 14, opacity: 0.95 }}>
              Stockiet
            </span>
            <button
              type="button"
              onClick={handleLogout}
              style={{
                ...labelFont,
                background: 'rgba(255,255,255,0.12)',
                border: '1px solid rgba(255,255,255,0.2)',
                color: '#fff',
                borderRadius: 8,
                padding: '6px 14px',
                cursor: 'pointer',
                fontSize: 13,
              }}
            >
              Logout
            </button>
            <button
              type="button"
              aria-label="Settings"
              style={{
                background: 'transparent',
                border: 'none',
                color: '#fff',
                cursor: 'pointer',
                padding: 6,
                fontSize: 18,
              }}
            >
              ⚙️
            </button>
          </header>



          {/* Main content */}
          <main
            style={{
              flex: 1,
              padding: 24,
              overflow: 'auto',
            }}
          >
            <h1
              style={{
                ...labelFont,
                margin: '0 0 20px',
                fontSize: 26,
                fontWeight: 700,
                color: '#1a1a1a',
              }}
            >
              Dashboard
            </h1>

            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                marginBottom: 16,
              }}
            >
              <div>
                <span style={{ ...labelFont, color: '#000', fontSize: 18 }}>
                  Retailer Play Report{' '}
                </span>
                <span style={{ ...labelFont, fontSize: 16, color: '#333' }}>
                  Available Points{' '}
                </span>
                <span
                  style={{
                    ...mono,
                    fontWeight: 700,
                    color: COLORS.accentRed,
                    fontSize: 18,
                  }}
                >
                  {formatMoney(dashboard.availablePoints)}
                </span>
              </div>
              <button
                type="button"
                style={{
                  ...labelFont,
                  background: COLORS.homeOrange,
                  color: '#fff',
                  border: 'none',
                  borderRadius: 10,
                  padding: '10px 22px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Home
              </button>
            </div>

            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                gap: 12,
                marginBottom: 16,
              }}
            >
              <label style={{ ...labelFont, fontSize: 14, color: '#333' }}>
                From
                <input
                  type="date"
                  value={filterFrom}
                  onChange={(e) => setFilterFrom(e.target.value)}
                  style={{
                    marginLeft: 8,
                    padding: '6px 10px',
                    borderRadius: 6,
                    border: `1px solid ${COLORS.tableBorder}`,
                  }}
                />
              </label>
              <label style={{ ...labelFont, fontSize: 14, color: '#333' }}>
                To
                <input
                  type="date"
                  value={filterTo}
                  onChange={(e) => setFilterTo(e.target.value)}
                  style={{
                    marginLeft: 8,
                    padding: '6px 10px',
                    borderRadius: 6,
                    border: `1px solid ${COLORS.tableBorder}`,
                  }}
                />
              </label>
              <button
                type="button"
                onClick={handleFilterSearch}
                style={{
                  ...labelFont,
                  background: COLORS.searchGreen,
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  padding: '8px 20px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Search
              </button>
            </div>

            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                marginBottom: 12,
              }}
            >
              <label style={{ ...labelFont, fontSize: 14, color: '#333' }}>
                Show{' '}
                <select
                  value={dashboard.pageSize}
                  onChange={(e) =>
                    setDashboard((d) => ({
                      ...d,
                      pageSize: Number(e.target.value) as PageSize,
                      currentPage: 1,
                    }))
                  }
                  style={{
                    margin: '0 6px',
                    padding: '6px 8px',
                    borderRadius: 6,
                    border: `1px solid ${COLORS.tableBorder}`,
                  }}
                >
                  {[10, 25, 50, 100].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
                entries
              </label>
              <label style={{ ...labelFont, fontSize: 14, color: '#333' }}>
                Search:{' '}
                <input
                  type="search"
                  value={dashboard.searchQuery}
                  onChange={(e) =>
                    setDashboard((d) => ({
                      ...d,
                      searchQuery: e.target.value,
                      currentPage: 1,
                    }))
                  }
                  style={{
                    marginLeft: 8,
                    padding: '6px 10px',
                    borderRadius: 6,
                    border: `1px solid ${COLORS.tableBorder}`,
                    minWidth: 200,
                  }}
                />
              </label>
            </div>

            <div
              style={{
                overflowX: 'auto',
                background: '#fff',
                border: `1px solid ${COLORS.tableBorder}`,
                borderRadius: 8,
                boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
              }}
            >
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  minWidth: 1400,
                }}
              >
                <thead>
                  <tr style={{ background: COLORS.headerBg, color: '#fff' }}>
                    {headerCell('id', '#', 2, 1, {
                      padding: '10px 8px',
                      textAlign: 'left',
                      fontSize: 12,
                      ...labelFont,
                      borderBottom: `1px solid rgba(255,255,255,0.12)`,
                    })}
                    {headerCell('accountCode', 'Action', 2, 1, {
                      padding: '10px 8px',
                      textAlign: 'left',
                      fontSize: 12,
                      ...labelFont,
                      borderBottom: `1px solid rgba(255,255,255,0.12)`,
                    })}
                    {headerCell('name', 'Name', 2, 1, {
                      padding: '10px 8px',
                      textAlign: 'left',
                      fontSize: 12,
                      ...labelFont,
                      borderBottom: `1px solid rgba(255,255,255,0.12)`,
                    })}
                    <th
                      colSpan={3}
                      style={{
                        padding: '10px 8px',
                        textAlign: 'center',
                        fontSize: 12,
                        ...labelFont,
                        borderBottom: `1px solid rgba(255,255,255,0.12)`,
                      }}
                    >
                      Sale Pt
                    </th>
                    <th
                      colSpan={3}
                      style={{
                        padding: '10px 8px',
                        textAlign: 'center',
                        fontSize: 12,
                        ...labelFont,
                        borderBottom: `1px solid rgba(255,255,255,0.12)`,
                      }}
                    >
                      Claim
                    </th>
                    <th
                      colSpan={3}
                      style={{
                        padding: '10px 8px',
                        textAlign: 'center',
                        fontSize: 12,
                        ...labelFont,
                        borderBottom: `1px solid rgba(255,255,255,0.12)`,
                      }}
                    >
                      Win
                    </th>
                    <th
                      colSpan={3}
                      style={{
                        padding: '10px 8px',
                        textAlign: 'center',
                        fontSize: 12,
                        ...labelFont,
                        borderBottom: `1px solid rgba(255,255,255,0.12)`,
                      }}
                    >
                      Commi
                    </th>
                    <th
                      colSpan={4}
                      style={{
                        padding: '10px 8px',
                        textAlign: 'center',
                        fontSize: 12,
                        ...labelFont,
                        borderLeft: `2px solid rgba(255,255,255,0.25)`,
                        borderBottom: `1px solid rgba(255,255,255,0.12)`,
                      }}
                    >
                      Net &amp; metrics
                    </th>
                  </tr>
                  <tr style={{ background: COLORS.headerBg, color: '#fff' }}>
                    {headerCell('salePt2D', 'Sale Pt-2D')}
                    {headerCell('salePt3D', 'Sale Pt(3d)')}
                    {headerCell('salePt12D', 'Sale Pt(12d)')}
                    {headerCell('claim2D', 'Claim 2D')}
                    {headerCell('claim3D', 'Claim(3d)')}
                    {headerCell('claim12D', 'Claim(12d)')}
                    {headerCell('win2D', 'Win-2D')}
                    {headerCell('win3D', 'Win(3d)')}
                    {headerCell('win12D', 'Win(12d)')}
                    {headerCell('commi2D', 'Commi-2D')}
                    {headerCell('commi3D', 'Commi(3d)')}
                    {headerCell('commi12D', 'Commi(12d)')}
                    {headerCell('netPt2D', 'Net 2D', undefined, undefined, {
                      borderLeft: `2px solid rgba(255,255,255,0.25)`,
                    })}
                    {headerCell('netPt3D', 'Net(3d)')}
                    {headerCell('netPt12D', 'Net(12d)')}
                    {headerCell('winPct', 'Win %')}
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ background: COLORS.totalsBg }}>
                    <td style={{ padding: '10px 8px', ...mono, fontWeight: 600 }}>
                      1
                    </td>
                    <td style={{ padding: '10px 8px' }} />
                    <td style={{ padding: '10px 8px', ...labelFont }} />
                    <td style={{ padding: '10px 8px', ...mono }}>
                      Total={formatMoney(totalsForView.salePt2D)}
                    </td>
                    <td style={{ padding: '10px 8px', ...mono }}>
                      Total={formatMoney(totalsForView.salePt3D)}
                    </td>
                    <td style={{ padding: '10px 8px', ...mono }}>
                      Total={formatMoney(totalsForView.salePt12D)}
                    </td>
                    <td style={{ padding: '10px 8px', ...mono }}>
                      Total={formatMoney(totalsForView.claim2D)}
                    </td>
                    <td style={{ padding: '10px 8px', ...mono }}>
                      Total={formatMoney(totalsForView.claim3D)}
                    </td>
                    <td style={{ padding: '10px 8px', ...mono }}>
                      Total={formatMoney(totalsForView.claim12D)}
                    </td>
                    <td style={{ padding: '10px 8px', ...mono }}>
                      Total={formatMoney(totalsForView.win2D)}
                    </td>
                    <td style={{ padding: '10px 8px', ...mono }}>
                      Total={formatMoney(totalsForView.win3D)}
                    </td>
                    <td style={{ padding: '10px 8px', ...mono }}>
                      Total={formatMoney(totalsForView.win12D)}
                    </td>
                    <td style={{ padding: '10px 8px', ...mono }}>
                      Total={formatMoney(totalsForView.commi2D)}
                    </td>
                    <td style={{ padding: '10px 8px', ...mono }}>
                      Total={formatMoney(totalsForView.commi3D)}
                    </td>
                    <td style={{ padding: '10px 8px', ...mono }}>
                      Total={formatMoney(totalsForView.commi12D)}
                    </td>
                    <td
                      style={{
                        padding: '10px 8px',
                        ...mono,
                        borderLeft: `2px solid ${COLORS.tableBorder}`,
                      }}
                    >
                      Total={formatMoney(totalsForView.netPt2D)}
                    </td>
                    <td style={{ padding: '10px 8px', ...mono }}>
                      Total={formatMoney(totalsForView.netPt3D)}
                    </td>
                    <td style={{ padding: '10px 8px', ...mono }}>
                      Total={formatMoney(totalsForView.netPt12D)}
                    </td>
                    <td style={{ padding: '10px 8px', ...mono }}>—</td>
                  </tr>
                  {pageRows.map((r, idx) => {
                    const globalIndex = pageStart + idx
                    const displayNum = globalIndex + 2
                    const bg = globalIndex % 2 === 0 ? COLORS.rowAlt : '#fff'
                    return (
                      <tr key={r.id} style={{ background: bg }}>
                        <td
                          style={{
                            padding: '10px 8px',
                            ...mono,
                            borderTop: `1px solid ${COLORS.tableBorder}`,
                          }}
                        >
                          {displayNum}
                        </td>
                        <td
                          style={{
                            padding: '10px 8px',
                            borderTop: `1px solid ${COLORS.tableBorder}`,
                          }}
                        >
                          <button
                            type="button"
                            aria-label="View row"
                            style={{
                              background: 'rgba(25, 118, 210, 0.08)',
                              border: `1px solid ${COLORS.tableBorder}`,
                              borderRadius: 6,
                              padding: '6px 8px',
                              cursor: 'pointer',
                              color: COLORS.navbar,
                            }}
                          >
                            <IconEye />
                          </button>
                        </td>
                        <td
                          style={{
                            padding: '10px 8px',
                            ...labelFont,
                            borderTop: `1px solid ${COLORS.tableBorder}`,
                            maxWidth: 280,
                          }}
                        >
                          <span aria-hidden style={{ marginRight: 6 }}>
                            🏛️
                          </span>
                          {r.name}
                        </td>
                        {(
                          [
                            r.salePt2D,
                            r.salePt3D,
                            r.salePt12D,
                            r.claim2D,
                            r.claim3D,
                            r.claim12D,
                            r.win2D,
                            r.win3D,
                            r.win12D,
                            r.commi2D,
                            r.commi3D,
                            r.commi12D,
                          ] as const
                        ).map((v, i) => (
                          <td
                            key={i}
                            style={{
                              padding: '10px 8px',
                              ...mono,
                              borderTop: `1px solid ${COLORS.tableBorder}`,
                            }}
                          >
                            {formatMoney(v)}
                          </td>
                        ))}
                        <td
                          style={{
                            padding: '10px 8px',
                            ...mono,
                            borderTop: `1px solid ${COLORS.tableBorder}`,
                            borderLeft: `2px solid ${COLORS.tableBorder}`,
                          }}
                        >
                          {formatMoney(r.netPt2D)}
                        </td>
                        <td
                          style={{
                            padding: '10px 8px',
                            ...mono,
                            borderTop: `1px solid ${COLORS.tableBorder}`,
                          }}
                        >
                          {formatMoney(r.netPt3D)}
                        </td>
                        <td
                          style={{
                            padding: '10px 8px',
                            ...mono,
                            borderTop: `1px solid ${COLORS.tableBorder}`,
                          }}
                        >
                          {formatMoney(r.netPt12D)}
                        </td>
                        <td
                          style={{
                            padding: '10px 8px',
                            ...mono,
                            borderTop: `1px solid ${COLORS.tableBorder}`,
                          }}
                        >
                          {formatMoney(r.winPct)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 16,
                marginTop: 16,
                ...labelFont,
                fontSize: 14,
                color: '#444',
              }}
            >
              <div>
                Showing {showingFrom} to {showingTo} of {sortedRetailers.length}{' '}
                entries
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  type="button"
                  disabled={safePage <= 1}
                  onClick={() =>
                    setDashboard((d) => ({
                      ...d,
                      currentPage: Math.max(1, d.currentPage - 1),
                    }))
                  }
                  style={{
                    padding: '6px 12px',
                    borderRadius: 6,
                    border: `1px solid ${COLORS.tableBorder}`,
                    background: safePage <= 1 ? '#eee' : '#fff',
                    cursor: safePage <= 1 ? 'not-allowed' : 'pointer',
                  }}
                >
                  Previous
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                  (p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() =>
                        setDashboard((d) => ({ ...d, currentPage: p }))
                      }
                      style={{
                        minWidth: 36,
                        padding: '6px 10px',
                        borderRadius: 20,
                        border: 'none',
                        background:
                          p === safePage ? COLORS.pillBlue : 'transparent',
                        color: p === safePage ? '#fff' : '#333',
                        fontWeight: p === safePage ? 700 : 500,
                        cursor: 'pointer',
                      }}
                    >
                      {p}
                    </button>
                  ),
                )}
                <button
                  type="button"
                  disabled={safePage >= totalPages}
                  onClick={() =>
                    setDashboard((d) => ({
                      ...d,
                      currentPage: Math.min(totalPages, d.currentPage + 1),
                    }))
                  }
                  style={{
                    padding: '6px 12px',
                    borderRadius: 6,
                    border: `1px solid ${COLORS.tableBorder}`,
                    background: safePage >= totalPages ? '#eee' : '#fff',
                    cursor: safePage >= totalPages ? 'not-allowed' : 'pointer',
                  }}
                >
                  Next
                </button>
              </div>
            </div>

            <p
              style={{
                ...labelFont,
                fontSize: 12,
                color: '#888',
                marginTop: 24,
              }}
            >
              Game types tracked: {GAME_TYPES.join(', ')} · Filter range{' '}
              {dashboard.fromDate} → {dashboard.toDate}
            </p>
          </main>
        </div>
      </div>
    </>
  )
}
