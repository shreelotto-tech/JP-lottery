import { useState, type CSSProperties } from 'react'
import { supabase } from '../../lib/supabase'
import { useAdminContext } from '../../lib/AdminContext'

const labelFont: CSSProperties = { fontFamily: "'Inter', sans-serif" }
const mono: CSSProperties = { fontFamily: "'JetBrains Mono', monospace" }

type FoundUser = { id: string; username: string; display_name: string | null; points: number }

export default function AddPoints() {
  const { isSubAdmin, adminProfile } = useAdminContext()
  const [search, setSearch] = useState('')
  const [user, setUser] = useState<FoundUser | null>(null)
  const [searching, setSearching] = useState(false)
  const [notFound, setNotFound] = useState(false)
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState<{ newBalance: number; action: 'credit' | 'debit' } | null>(null)
  const [error, setError] = useState('')

  async function handleSearch() {
    if (!search.trim()) return
    setSearching(true)
    setNotFound(false)
    setUser(null)
    setSuccess(null)
    const q = search.trim()

    let query = supabase
      .from('profiles')
      .select('id, username, display_name, points')
      .eq('role', 'retailer')
      .or(`username.eq.${q},display_name.ilike.%${q}%`)
      .limit(1)

    // Sub-admins can only find their own retailers
    if (isSubAdmin && adminProfile) {
      query = query.eq('parent_id', adminProfile.id)
    }

    const { data } = await query.maybeSingle()
    if (data) setUser({ ...data, points: Number(data.points) })
    else setNotFound(true)
    setSearching(false)
  }

  async function handleCredit() {
    if (!user) return
    const pts = Number(amount)
    if (isNaN(pts) || pts <= 0) { setError('Enter a positive number'); return }
    setLoading(true)
    setError('')
    const newBalance = user.points + pts
    const { error: updateErr } = await supabase.from('profiles').update({ points: newBalance, updated_at: new Date().toISOString() }).eq('id', user.id)
    if (updateErr) { setError(updateErr.message); setLoading(false); return }
    await supabase.from('transactions').insert({ user_id: user.id, type: 'admin_credit', amount: pts, balance_after: newBalance, description: 'Admin top-up' })
    setUser({ ...user, points: newBalance })
    setSuccess({ newBalance, action: 'credit' })
    setAmount('')
    setLoading(false)
  }

  async function handleDebit() {
    if (!user) return
    const pts = Number(amount)
    if (isNaN(pts) || pts <= 0) { setError('Enter a positive number'); return }
    if (pts > user.points) { setError(`Insufficient balance. Current balance: ${user.points.toFixed(2)}`); return }
    setLoading(true)
    setError('')
    const newBalance = user.points - pts
    const { error: updateErr } = await supabase.from('profiles').update({ points: newBalance, updated_at: new Date().toISOString() }).eq('id', user.id)
    if (updateErr) { setError(updateErr.message); setLoading(false); return }
    await supabase.from('transactions').insert({ user_id: user.id, type: 'admin_credit', amount: -pts, balance_after: newBalance, description: 'Admin debit' })
    setUser({ ...user, points: newBalance })
    setSuccess({ newBalance, action: 'debit' })
    setAmount('')
    setLoading(false)
  }

  const inputStyle: CSSProperties = { width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #d0d0d0', fontSize: 14, outline: 'none', ...labelFont }

  return (
    <div>
      <h1 style={{ ...labelFont, margin: '0 0 24px', fontSize: 26, fontWeight: 700, color: '#1a1a1a' }}>Debit / Credit</h1>

      {/* Search */}
      <div style={{ background: '#fff', borderRadius: 12, padding: 28, maxWidth: 500, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', marginBottom: 20 }}>
        <label style={{ ...labelFont, fontSize: 13, fontWeight: 600, color: '#555', display: 'block', marginBottom: 6 }}>Search by Username or Name</label>
        <div style={{ display: 'flex', gap: 8 }}>
          <input value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearch()} placeholder="Enter username or name" style={{ ...inputStyle, flex: 1 }} />
          <button type="button" onClick={handleSearch} disabled={searching} style={{ ...labelFont, padding: '10px 20px', borderRadius: 8, border: 'none', background: '#43a047', color: '#fff', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
            {searching ? '...' : 'Search'}
          </button>
        </div>
        {notFound && <div style={{ color: '#e53935', fontSize: 13, marginTop: 8 }}>User not found</div>}
      </div>

      {/* User card + debit/credit */}
      {user && (
        <div style={{ background: '#fff', borderRadius: 12, padding: 28, maxWidth: 500, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
          <div style={{ background: '#f5f0ff', borderRadius: 10, padding: 20, marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ ...labelFont, fontSize: 13, color: '#666' }}>Name</span>
              <span style={{ ...labelFont, fontWeight: 600 }}>{user.display_name || '—'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ ...labelFont, fontSize: 13, color: '#666' }}>Username</span>
              <span style={{ ...mono, fontWeight: 600 }}>{user.username}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ ...labelFont, fontSize: 13, color: '#666' }}>Current Balance</span>
              <span style={{ ...mono, fontWeight: 700, color: '#5b21b6' }}>{user.points.toFixed(2)}</span>
            </div>
          </div>

          <label style={{ ...labelFont, fontSize: 13, fontWeight: 600, color: '#555', display: 'block', marginBottom: 6 }}>Amount</label>
          <input type="number" min="1" value={amount} onChange={(e) => { setAmount(e.target.value); setError(''); setSuccess(null) }} placeholder="Enter amount" style={{ ...inputStyle, marginBottom: 12 }} />
          {error && <div style={{ color: '#e53935', fontSize: 13, marginBottom: 8 }}>{error}</div>}
          {success && (
            <div style={{ color: success.action === 'credit' ? '#2e7d32' : '#b71c1c', fontSize: 13, marginBottom: 8, fontWeight: 600 }}>
              {success.action === 'credit' ? '✅ Points credited!' : '✅ Points debited!'} New balance: {success.newBalance.toFixed(2)}
            </div>
          )}
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" onClick={handleCredit} disabled={loading} style={{ ...labelFont, flex: 1, padding: '12px', borderRadius: 8, border: 'none', background: loading ? '#999' : '#43a047', color: '#fff', fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer' }}>
              {loading ? '...' : 'Credit'}
            </button>
            <button type="button" onClick={handleDebit} disabled={loading} style={{ ...labelFont, flex: 1, padding: '12px', borderRadius: 8, border: 'none', background: loading ? '#999' : '#e53935', color: '#fff', fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer' }}>
              {loading ? '...' : 'Debit'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
