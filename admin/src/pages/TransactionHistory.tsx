import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { supabase } from '../lib/supabase'
import { useAdminContext } from '../lib/AdminContext'

const labelFont: CSSProperties = { fontFamily: "'Inter', sans-serif" }
const mono: CSSProperties = { fontFamily: "'JetBrains Mono', monospace" }
const COLORS = { tableBorder: '#e0e0e0', headerBg: '#2c2c3e', rowAlt: '#fafafa', pillBlue: '#1976d2', activeTab: '#5b21b6' }

type Tab = 'topups' | 'creation' | 'all'
type DcFilter = 'all' | 'credit' | 'debit'
type TypeFilter = 'all' | 'bet_placed' | 'bet_won' | 'bet_refund' | 'admin_credit'

type TxRow = { id: string; user_id: string; type: string; amount: number; balance_after: number; description: string | null; created_at: string; username?: string; display_name?: string | null }

const VISIBLE_STEP = 20

export default function TransactionHistory() {
  const { isSubAdmin, adminProfile } = useAdminContext()
  const [activeTab, setActiveTab] = useState<Tab>('topups')
  const [transactions, setTransactions] = useState<TxRow[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [dcFilter, setDcFilter] = useState<DcFilter>('all')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [visibleCount, setVisibleCount] = useState(VISIBLE_STEP)
  const sentinelRef = useRef<HTMLDivElement>(null)

  async function fetchAll() {
    setLoading(true)

    // For sub-admins, scope to their retailers' transactions only
    let allowedIds: string[] | null = null
    if (isSubAdmin && adminProfile) {
      const { data: myRetailers } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'retailer')
        .eq('parent_id', adminProfile.id)
      allowedIds = (myRetailers ?? []).map((r) => r.id)
    }

    let txQuery = supabase.from('transactions').select('*').order('created_at', { ascending: false })
    if (allowedIds !== null) {
      if (allowedIds.length === 0) {
        setTransactions([])
        setLoading(false)
        return
      }
      txQuery = txQuery.in('user_id', allowedIds)
    }

    const { data: txs } = await txQuery

    let profilesQuery = supabase.from('profiles').select('id, username, display_name').eq('role', 'retailer')
    if (allowedIds !== null) profilesQuery = profilesQuery.in('id', allowedIds)
    const { data: profiles } = await profilesQuery

    if (txs && profiles) {
      const pMap = new Map(profiles.map((p) => [p.id, p]))
      setTransactions(txs.map((t) => {
        const p = pMap.get(t.user_id)
        return { ...t, amount: Number(t.amount), balance_after: Number(t.balance_after), username: p?.username || '?', display_name: p?.display_name }
      }))
    }
    setLoading(false)
  }

  useEffect(() => { fetchAll() }, [isSubAdmin, adminProfile?.id])

  const filtered = useMemo(() => {
    let list = transactions

    if (activeTab === 'topups') {
      list = list.filter((t) => t.type === 'admin_credit' && (t.description === 'Admin top-up' || t.description === 'Admin debit'))
      if (dcFilter === 'credit') list = list.filter((t) => t.amount > 0)
      else if (dcFilter === 'debit') list = list.filter((t) => t.amount < 0)
    } else if (activeTab === 'creation') {
      list = list.filter((t) => t.type === 'admin_credit' && t.description === 'Initial points on account creation')
    } else {
      if (typeFilter !== 'all') list = list.filter((t) => t.type === typeFilter)
    }

    if (fromDate) list = list.filter((t) => t.created_at >= `${fromDate}T00:00:00`)
    if (toDate) list = list.filter((t) => t.created_at <= `${toDate}T23:59:59`)

    const q = searchQuery.trim().toLowerCase()
    if (q) list = list.filter((t) => (t.username || '').includes(q) || (t.display_name || '').toLowerCase().includes(q))
    return list
  }, [transactions, activeTab, searchQuery, fromDate, toDate, dcFilter, typeFilter])

  useEffect(() => { setVisibleCount(VISIBLE_STEP) }, [activeTab, searchQuery, fromDate, toDate, dcFilter, typeFilter])

  const visibleRows = filtered.slice(0, visibleCount)

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) setVisibleCount((n) => n + VISIBLE_STEP)
    }, { threshold: 0.1 })
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [filtered])

  const tabs: { key: Tab; label: string }[] = [
    { key: 'topups', label: 'Debit / Credit' },
    { key: 'creation', label: 'User Creation Log' },
    { key: 'all', label: 'All Transactions' },
  ]

  const thStyle: CSSProperties = { padding: '10px 12px', textAlign: 'left', whiteSpace: 'nowrap', borderBottom: '1px solid rgba(255,255,255,0.12)', ...labelFont, fontSize: 12 }
  const tdStyle: CSSProperties = { padding: '10px 12px', borderTop: `1px solid ${COLORS.tableBorder}`, fontSize: 13 }

  const pillBtn = (active: boolean): CSSProperties => ({
    ...labelFont, padding: '4px 14px', borderRadius: 20, border: 'none', fontSize: 12, cursor: 'pointer', fontWeight: active ? 700 : 500,
    background: active ? '#5b21b6' : '#ede9fe', color: active ? '#fff' : '#5b21b6',
  })

  const columns = activeTab === 'topups'
    ? ['#', 'Username', 'Display Name', 'Type', 'Amount', 'Balance After', 'Date']
    : activeTab === 'creation'
    ? ['#', 'Username', 'Display Name', 'Initial Points', 'Created At']
    : ['#', 'Username', 'Display Name', 'Type', 'Amount', 'Balance After', 'Description', 'Date']

  function amountCell(amount: number) {
    const color = amount >= 0 ? '#2e7d32' : '#c62828'
    const prefix = amount >= 0 ? '+' : ''
    return <td style={{ ...tdStyle, ...mono, color, fontWeight: 600 }}>{prefix}{amount.toFixed(2)}</td>
  }

  const typeLabels: Record<string, string> = { bet_placed: 'Bet Placed', bet_won: 'Claimed', bet_refund: 'Refund', admin_credit: 'Admin' }
  const typeBadgeColors: Record<string, { bg: string; color: string }> = {
    bet_placed: { bg: '#e3f2fd', color: '#1565c0' },
    bet_won: { bg: '#e8f5e9', color: '#2e7d32' },
    bet_refund: { bg: '#fff3e0', color: '#e65100' },
    admin_credit: { bg: '#e8eaf6', color: '#283593' },
  }

  function typeBadge(type: string) {
    const c = typeBadgeColors[type] || { bg: '#f5f5f5', color: '#555' }
    return <span style={{ ...labelFont, fontSize: 11, padding: '2px 8px', borderRadius: 10, background: c.bg, color: c.color }}>{typeLabels[type] || type}</span>
  }

  return (
    <div>
      <h1 style={{ ...labelFont, margin: '0 0 20px', fontSize: 26, fontWeight: 700, color: '#1a1a1a' }}>Transaction History</h1>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
        {tabs.map((t) => (
          <button key={t.key} type="button" onClick={() => setActiveTab(t.key)} style={{ ...labelFont, padding: '8px 20px', borderRadius: '8px 8px 0 0', border: `1px solid ${COLORS.tableBorder}`, borderBottom: activeTab === t.key ? '2px solid #5b21b6' : `1px solid ${COLORS.tableBorder}`, background: activeTab === t.key ? '#fff' : '#f0f0f0', color: activeTab === t.key ? '#5b21b6' : '#666', fontWeight: activeTab === t.key ? 700 : 500, cursor: 'pointer', fontSize: 13 }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        {activeTab === 'topups' && (
          <>
            <div style={{ display: 'flex', gap: 6 }}>
              {(['all', 'credit', 'debit'] as DcFilter[]).map((f) => (
                <button key={f} type="button" onClick={() => setDcFilter(f)} style={pillBtn(dcFilter === f)}>
                  {f === 'all' ? 'All' : f === 'credit' ? 'Credit' : 'Debit'}
                </button>
              ))}
            </div>
            <label style={{ ...labelFont, fontSize: 13, color: '#333' }}>From <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} style={{ marginLeft: 4, padding: '5px 8px', borderRadius: 6, border: `1px solid ${COLORS.tableBorder}` }} /></label>
            <label style={{ ...labelFont, fontSize: 13, color: '#333' }}>To <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} style={{ marginLeft: 4, padding: '5px 8px', borderRadius: 6, border: `1px solid ${COLORS.tableBorder}` }} /></label>
          </>
        )}
        {activeTab === 'all' && (
          <>
            <div style={{ display: 'flex', gap: 6 }}>
              {(['all', 'bet_placed', 'bet_won', 'bet_refund', 'admin_credit'] as TypeFilter[]).map((f) => (
                <button key={f} type="button" onClick={() => setTypeFilter(f)} style={pillBtn(typeFilter === f)}>
                  {f === 'all' ? 'All' : typeLabels[f]}
                </button>
              ))}
            </div>
            <label style={{ ...labelFont, fontSize: 13, color: '#333' }}>From <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} style={{ marginLeft: 4, padding: '5px 8px', borderRadius: 6, border: `1px solid ${COLORS.tableBorder}` }} /></label>
            <label style={{ ...labelFont, fontSize: 13, color: '#333' }}>To <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} style={{ marginLeft: 4, padding: '5px 8px', borderRadius: 6, border: `1px solid ${COLORS.tableBorder}` }} /></label>
          </>
        )}
        <label style={{ ...labelFont, fontSize: 13, color: '#333', marginLeft: 'auto' }}>
          Search: <input type="search" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ marginLeft: 4, padding: '6px 10px', borderRadius: 6, border: `1px solid ${COLORS.tableBorder}`, minWidth: 180 }} />
        </label>
      </div>

      {loading ? <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>Loading...</div> : (
        <>
          <div style={{ overflowX: 'auto', background: '#fff', border: `1px solid ${COLORS.tableBorder}`, borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: COLORS.headerBg, color: '#fff' }}>
                  {columns.map((c) => <th key={c} style={thStyle}>{c}</th>)}
                </tr>
              </thead>
              <tbody>
                {visibleRows.length === 0 ? (
                  <tr><td colSpan={columns.length} style={{ ...tdStyle, textAlign: 'center', color: '#888', padding: 32 }}>No transactions found</td></tr>
                ) : visibleRows.map((t, i) => (
                  <tr key={t.id} style={{ background: i % 2 === 0 ? COLORS.rowAlt : '#fff' }}>
                    <td style={{ ...tdStyle, ...mono }}>{i + 1}</td>
                    <td style={{ ...tdStyle, ...mono }}>{t.username}</td>
                    {activeTab === 'topups' && <>
                      <td style={{ ...tdStyle, ...labelFont }}>{t.display_name || '—'}</td>
                      <td style={tdStyle}>
                        {t.amount >= 0
                          ? <span style={{ ...labelFont, fontSize: 11, padding: '2px 8px', borderRadius: 10, background: '#e8f5e9', color: '#2e7d32' }}>Credit</span>
                          : <span style={{ ...labelFont, fontSize: 11, padding: '2px 8px', borderRadius: 10, background: '#ffebee', color: '#c62828' }}>Debit</span>}
                      </td>
                      {amountCell(t.amount)}
                      <td style={{ ...tdStyle, ...mono }}>{t.balance_after.toFixed(2)}</td>
                      <td style={{ ...tdStyle, ...labelFont, fontSize: 12 }}>{new Date(t.created_at).toLocaleString()}</td>
                    </>}
                    {activeTab === 'creation' && <>
                      <td style={{ ...tdStyle, ...labelFont }}>{t.display_name || '—'}</td>
                      <td style={{ ...tdStyle, ...mono }}>{t.amount.toFixed(2)}</td>
                      <td style={{ ...tdStyle, ...labelFont, fontSize: 12 }}>{new Date(t.created_at).toLocaleString()}</td>
                    </>}
                    {activeTab === 'all' && <>
                      <td style={{ ...tdStyle, ...labelFont }}>{t.display_name || '—'}</td>
                      <td style={tdStyle}>{typeBadge(t.type)}</td>
                      {amountCell(t.amount)}
                      <td style={{ ...tdStyle, ...mono }}>{t.balance_after.toFixed(2)}</td>
                      <td style={{ ...tdStyle, ...labelFont, fontSize: 12 }}>{t.description || '—'}</td>
                      <td style={{ ...tdStyle, ...labelFont, fontSize: 12 }}>{new Date(t.created_at).toLocaleString()}</td>
                    </>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div ref={sentinelRef} style={{ height: 1 }} />

          <div style={{ ...labelFont, fontSize: 13, color: '#888', marginTop: 10, textAlign: 'right' }}>
            Showing {Math.min(visibleCount, filtered.length)} of {filtered.length}
          </div>
        </>
      )}
    </div>
  )
}
