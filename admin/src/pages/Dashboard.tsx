import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { supabase } from '../lib/supabase'
import { useAdminContext } from '../lib/AdminContext'

type RetailerStats = {
  id: string
  username: string
  display_name: string | null
  is_active: boolean
  percentage: number
  salePt: number
  claim: number
  win: number
  commi: number
  net: number
  winPct: number | null
}

type AggStats = { sale_pt: number; claim: number }

type DrillBet = {
  id: string
  number: number
  bet_type: string
  quantity?: number
  amount?: number
  points_cost: number
  payout: number | null
  status: string
  placed_at: string
  _game: '2D' | '3D'
}

const COLORS = {
  tableBorder: '#e0e0e0',
  headerBg: '#2c2c3e',
  totalsBg: '#fffde7',
  rowAlt: '#fafafa',
  accentRed: '#e53935',
  searchGreen: '#43a047',
  pillBlue: '#1976d2',
} as const

const mono: CSSProperties = { fontFamily: "'JetBrains Mono', monospace" }
const labelFont: CSSProperties = { fontFamily: "'Inter', sans-serif" }

function formatMoney(n: number): string {
  return Number(n.toFixed(2)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function todayISO(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function Dashboard() {
  const { isSubAdmin, adminProfile } = useAdminContext()
  const [availablePoints, setAvailablePoints] = useState(0)
  const [fromDate, setFromDate] = useState(todayISO)
  const [toDate, setToDate] = useState(todayISO)
  const [profiles, setProfiles] = useState<{ id: string; username: string; display_name: string | null; is_active: boolean; percentage: number }[]>([])
  const [statsMap, setStatsMap] = useState<Map<string, AggStats>>(new Map())
  const [loading, setLoading] = useState(true)
  const [drillUser, setDrillUser] = useState<string | null>(null)
  const [drillBets, setDrillBets] = useState<DrillBet[]>([])
  const [drillLoading, setDrillLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [pageSize, setPageSize] = useState(10)
  const [currentPage, setCurrentPage] = useState(1)

  async function fetchData(from: string, to: string) {
    setLoading(true)

    let profilesQuery = supabase
      .from('profiles')
      .select('id, username, display_name, is_active, percentage')
      .eq('role', 'retailer')
    let pointsQuery = supabase.from('profiles').select('points').eq('role', 'retailer')
    const statsParams: Record<string, unknown> = { from_date: from, to_date: to }

    if (isSubAdmin && adminProfile) {
      profilesQuery = profilesQuery.eq('parent_id', adminProfile.id)
      pointsQuery = pointsQuery.eq('parent_id', adminProfile.id)
      statsParams.p_parent_id = adminProfile.id
    }

    const [pointsRes, profilesRes, statsRes] = await Promise.all([
      pointsQuery,
      profilesQuery,
      supabase.rpc('get_retailer_stats', statsParams),
    ])

    if (pointsRes.data) {
      setAvailablePoints(pointsRes.data.reduce((s, r) => s + Number(r.points || 0), 0))
    }
    if (profilesRes.data) setProfiles(profilesRes.data)
    if (statsRes.data) {
      const map = new Map<string, AggStats>()
      statsRes.data.forEach((row: { user_id: string; sale_pt: number; claim: number }) => {
        map.set(row.user_id, { sale_pt: Number(row.sale_pt), claim: Number(row.claim) })
      })
      setStatsMap(map)
    }
    setLoading(false)
  }

  useEffect(() => { fetchData(fromDate, toDate) }, [])

  const retailers: RetailerStats[] = useMemo(() => {
    return profiles.map((p) => {
      const pct = Number(p.percentage ?? 10) / 100
      const stats = statsMap.get(p.id) ?? { sale_pt: 0, claim: 0 }
      const salePt = stats.sale_pt
      const claim = stats.claim
      const win = claim
      const commi = salePt * pct
      const net = salePt - claim - commi
      const winPct = salePt > 0 ? (claim / salePt) * 100 : null

      return {
        id: p.id, username: p.username, display_name: p.display_name,
        percentage: Number(p.percentage ?? 10), is_active: p.is_active,
        salePt, claim, win, commi, net, winPct
      }
    })
  }, [profiles, statsMap])

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    const list = q ? retailers.filter((r) => (r.display_name || '').toLowerCase().includes(q) || r.username.includes(q)) : retailers
    const active = list.filter((r) => r.is_active).sort((a, b) => b.salePt - a.salePt)
    const inactive = list.filter((r) => !r.is_active)
    return [...active, ...inactive]
  }, [retailers, searchQuery])

  const totals = useMemo(() => {
    const all = retailers
    const salePt = all.reduce((s, r) => s + r.salePt, 0)
    const claim = all.reduce((s, r) => s + r.claim, 0)
    const win = all.reduce((s, r) => s + r.win, 0)
    const commi = all.reduce((s, r) => s + r.commi, 0)
    const net = all.reduce((s, r) => s + r.net, 0)
    const winPct = salePt > 0 ? (claim / salePt) * 100 : null

    return { salePt, claim, win, commi, net, winPct }
  }, [retailers])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const safePage = Math.min(currentPage, totalPages)
  const pageRows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize)

  async function openDrill(userId: string) {
    setDrillUser(userId)
    setDrillBets([])
    setDrillLoading(true)

    const [draws2dRes, draws3dRes] = await Promise.all([
      supabase.from('draws').select('id').gte('draw_date', fromDate).lte('draw_date', toDate),
      supabase.from('draws_3d').select('id').gte('draw_date', fromDate).lte('draw_date', toDate),
    ])

    const draw2dIds = draws2dRes.data?.map((d) => d.id) ?? []
    const draw3dIds = draws3dRes.data?.map((d) => d.id) ?? []

    const [bets2dRes, bets3dRes] = await Promise.all([
      draw2dIds.length > 0
        ? supabase.from('bets').select('*').eq('user_id', userId).in('draw_id', draw2dIds).order('placed_at', { ascending: false })
        : Promise.resolve({ data: [] as any[] }),
      draw3dIds.length > 0
        ? supabase.from('bets_3d').select('*').eq('user_id', userId).in('draw_id', draw3dIds).order('placed_at', { ascending: false })
        : Promise.resolve({ data: [] as any[] }),
    ])

    const tagged2d: DrillBet[] = (bets2dRes.data ?? []).map((b) => ({ ...b, points_cost: Number(b.points_cost), payout: b.payout != null ? Number(b.payout) : null, _game: '2D' as const }))
    const tagged3d: DrillBet[] = (bets3dRes.data ?? []).map((b) => ({ ...b, points_cost: Number(b.points_cost), payout: b.payout != null ? Number(b.payout) : null, _game: '3D' as const }))
    const combined = [...tagged2d, ...tagged3d].sort((a, b) => new Date(b.placed_at).getTime() - new Date(a.placed_at).getTime())
    setDrillBets(combined)
    setDrillLoading(false)
  }

  const thStyle: CSSProperties = { padding: '10px 12px', textAlign: 'left', whiteSpace: 'nowrap', borderBottom: `1px solid rgba(255,255,255,0.12)`, ...labelFont, fontSize: 12 }
  const tdStyle: CSSProperties = { padding: '10px 12px', ...mono, borderTop: `1px solid ${COLORS.tableBorder}`, fontSize: 13 }

  return (
    <div>
      <h1 style={{ ...labelFont, margin: '0 0 20px', fontSize: 26, fontWeight: 700, color: '#1a1a1a' }}>Dashboard</h1>

      {/* Top bar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
        <div>
          <span style={{ ...labelFont, fontSize: 16, color: '#333' }}>Available Points </span>
          <span style={{ ...mono, fontWeight: 700, color: COLORS.accentRed, fontSize: 20 }}>{formatMoney(availablePoints)}</span>
        </div>
      </div>

      {/* Date filters */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <label style={{ ...labelFont, fontSize: 14, color: '#333' }}>
          From
          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} style={{ marginLeft: 8, padding: '6px 10px', borderRadius: 6, border: `1px solid ${COLORS.tableBorder}` }} />
        </label>
        <label style={{ ...labelFont, fontSize: 14, color: '#333' }}>
          To
          <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} style={{ marginLeft: 8, padding: '6px 10px', borderRadius: 6, border: `1px solid ${COLORS.tableBorder}` }} />
        </label>
        <button type="button" onClick={() => { fetchData(fromDate, toDate); setCurrentPage(1) }} style={{ ...labelFont, background: COLORS.searchGreen, color: '#fff', border: 'none', borderRadius: 8, padding: '8px 20px', fontWeight: 600, cursor: 'pointer' }}>
          Search
        </button>
      </div>

      {/* Search + page size */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
        <label style={{ ...labelFont, fontSize: 14, color: '#333' }}>
          Show{' '}
          <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1) }} style={{ margin: '0 6px', padding: '6px 8px', borderRadius: 6, border: `1px solid ${COLORS.tableBorder}` }}>
            {[10, 25, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
          entries
        </label>
        <label style={{ ...labelFont, fontSize: 14, color: '#333' }}>
          Search:{' '}
          <input type="search" value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1) }} style={{ marginLeft: 8, padding: '6px 10px', borderRadius: 6, border: `1px solid ${COLORS.tableBorder}`, minWidth: 200 }} />
        </label>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>Loading...</div>
      ) : (
        <>
          <div style={{ overflowX: 'auto', background: '#fff', border: `1px solid ${COLORS.tableBorder}`, borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
              <thead>
                <tr style={{ background: COLORS.headerBg, color: '#fff' }}>
                  <th style={thStyle}>#</th>
                  <th style={thStyle}>Action</th>
                  <th style={thStyle}>Name</th>
                  <th style={thStyle}>Sale Pt</th>
                  <th style={thStyle}>Claim</th>
                  <th style={thStyle}>Win</th>
                  <th style={thStyle}>Commi</th>
                  <th style={thStyle}>Net Pay</th>
                  <th style={thStyle}>Win %</th>
                </tr>
              </thead>
              <tbody>
                {/* Totals row */}
                <tr style={{ background: COLORS.totalsBg, fontWeight: 700 }}>
                  <td style={tdStyle}>1</td>
                  <td style={tdStyle}></td>
                  <td style={{ ...tdStyle, ...labelFont }}>TOTALS</td>
                  <td style={tdStyle}>{formatMoney(totals.salePt)}</td>
                  <td style={tdStyle}>{formatMoney(totals.claim)}</td>
                  <td style={tdStyle}>{formatMoney(totals.win)}</td>
                  <td style={tdStyle}>{formatMoney(totals.commi)}</td>
                  <td style={tdStyle}>{formatMoney(totals.net)}</td>
                  <td style={tdStyle}>{totals.winPct !== null ? `${totals.winPct.toFixed(1)}%` : '—'}</td>
                </tr>
                {pageRows.map((r, idx) => (
                  <tr key={r.id} style={{ background: idx % 2 === 0 ? COLORS.rowAlt : '#fff', opacity: r.is_active ? 1 : 0.5 }}>
                    <td style={tdStyle}>{(safePage - 1) * pageSize + idx + 2}</td>
                    <td style={tdStyle}>
                      <button type="button" onClick={() => openDrill(r.id)} aria-label="View" style={{ background: 'rgba(25,118,210,0.08)', border: `1px solid ${COLORS.tableBorder}`, borderRadius: 6, padding: '6px 8px', cursor: 'pointer', color: '#2d1052' }}>
                        👁
                      </button>
                    </td>
                    <td style={{ ...tdStyle, ...labelFont }}>{r.display_name || r.username}{!r.is_active && ' (inactive)'}</td>
                    <td style={tdStyle}>{formatMoney(r.salePt)}</td>
                    <td style={tdStyle}>{formatMoney(r.claim)}</td>
                    <td style={tdStyle}>{formatMoney(r.win)}</td>
                    <td style={tdStyle}>{formatMoney(r.commi)}</td>
                    <td style={tdStyle}>{formatMoney(r.net)}</td>
                    <td style={tdStyle}>{r.winPct !== null ? `${r.winPct.toFixed(1)}%` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginTop: 16, ...labelFont, fontSize: 14, color: '#444' }}>
            <div>Showing {filtered.length === 0 ? 0 : (safePage - 1) * pageSize + 1} to {Math.min(safePage * pageSize, filtered.length)} of {filtered.length} entries</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <button type="button" disabled={safePage <= 1} onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} style={{ padding: '6px 12px', borderRadius: 6, border: `1px solid ${COLORS.tableBorder}`, background: safePage <= 1 ? '#eee' : '#fff', cursor: safePage <= 1 ? 'not-allowed' : 'pointer' }}>Previous</button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button key={p} type="button" onClick={() => setCurrentPage(p)} style={{ minWidth: 36, padding: '6px 10px', borderRadius: 20, border: 'none', background: p === safePage ? COLORS.pillBlue : 'transparent', color: p === safePage ? '#fff' : '#333', fontWeight: p === safePage ? 700 : 500, cursor: 'pointer' }}>{p}</button>
              ))}
              <button type="button" disabled={safePage >= totalPages} onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} style={{ padding: '6px 12px', borderRadius: 6, border: `1px solid ${COLORS.tableBorder}`, background: safePage >= totalPages ? '#eee' : '#fff', cursor: safePage >= totalPages ? 'not-allowed' : 'pointer' }}>Next</button>
            </div>
          </div>
        </>
      )}

      {/* Drill-down modal */}
      {drillUser && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'grid', placeItems: 'center', zIndex: 999 }} onClick={() => { setDrillUser(null); setDrillBets([]); setDrillLoading(false) }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 12, padding: 24, maxWidth: 800, width: '90%', maxHeight: '80vh', overflow: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <h2 style={{ ...labelFont, margin: 0, fontSize: 20 }}>Bets Detail — {profiles.find((p) => p.id === drillUser)?.display_name || drillUser}</h2>
              <button type="button" onClick={() => { setDrillUser(null); setDrillBets([]); setDrillLoading(false) }} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }}>✕</button>
            </div>
            {drillLoading ? (
              <p style={{ color: '#888' }}>Loading...</p>
            ) : drillBets.length === 0 ? (
              <p style={{ color: '#888' }}>No bets in selected date range.</p>
            ) : (
              <>
                {/* Summary row matching get_retailer_stats logic */}
                {(() => {
                  const salePt = drillBets.filter(b => b.status !== 'cancelled').reduce((s, b) => s + b.points_cost, 0)
                  const claim = drillBets.filter(b => b.status === 'won' || b.status === 'claimed').reduce((s, b) => s + (b.payout ?? 0), 0)
                  return (
                    <div style={{ display: 'flex', gap: 24, marginBottom: 12, padding: '8px 12px', background: COLORS.totalsBg, borderRadius: 6, ...labelFont, fontSize: 13 }}>
                      <span>Sale Pt: <strong style={{ ...mono }}>{formatMoney(salePt)}</strong></span>
                      <span>Claim: <strong style={{ ...mono, color: '#2e7d32' }}>{formatMoney(claim)}</strong></span>
                      <span style={{ marginLeft: 'auto', color: '#888' }}>
                        2D: {drillBets.filter(b => b._game === '2D').length} bets &nbsp;|&nbsp; 3D: {drillBets.filter(b => b._game === '3D').length} bets
                      </span>
                    </div>
                  )
                })()}
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: COLORS.headerBg, color: '#fff' }}>
                      <th style={thStyle}>#</th>
                      <th style={thStyle}>Game</th>
                      <th style={thStyle}>Number</th>
                      <th style={thStyle}>Type</th>
                      <th style={thStyle}>Qty</th>
                      <th style={thStyle}>Cost</th>
                      <th style={thStyle}>Payout</th>
                      <th style={thStyle}>Status</th>
                      <th style={thStyle}>Placed At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {drillBets.map((b, i) => (
                      <tr key={b.id} style={{ background: i % 2 === 0 ? COLORS.rowAlt : '#fff' }}>
                        <td style={tdStyle}>{i + 1}</td>
                        <td style={{ ...tdStyle, fontWeight: 700, color: b._game === '3D' ? '#7c3aed' : '#1976d2' }}>{b._game}</td>
                        <td style={tdStyle}>{b.number}</td>
                        <td style={tdStyle}>{b.bet_type}</td>
                        <td style={tdStyle}>{b._game === '2D' ? b.quantity : '—'}</td>
                        <td style={tdStyle}>{formatMoney(b.points_cost)}</td>
                        <td style={tdStyle}>{formatMoney(b.payout ?? 0)}</td>
                        <td style={tdStyle}>{b.status}</td>
                        <td style={{ ...tdStyle, fontSize: 12 }}>{new Date(b.placed_at).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
