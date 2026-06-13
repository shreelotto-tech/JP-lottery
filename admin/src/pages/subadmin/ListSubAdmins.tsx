import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { supabase } from '../../lib/supabase'

const labelFont: CSSProperties = { fontFamily: "'Inter', sans-serif" }
const mono: CSSProperties = { fontFamily: "'JetBrains Mono', monospace" }
const COLORS = { tableBorder: '#e0e0e0', headerBg: '#2c2c3e', rowAlt: '#fafafa', pillBlue: '#1976d2' }

type SubAdmin = { id: string; username: string; display_name: string | null; is_active: boolean; created_at: string }

export default function ListSubAdmins() {
  const [subAdmins, setSubAdmins] = useState<SubAdmin[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 10

  const [pwModal, setPwModal] = useState<{ userId: string; username: string } | null>(null)
  const [pwLoading, setPwLoading] = useState(false)
  const [newPin, setNewPin] = useState<string | null>(null)
  const [pwError, setPwError] = useState('')

  async function fetchSubAdmins() {
    setLoading(true)
    const { data } = await supabase
      .from('profiles')
      .select('id, username, display_name, is_active, created_at')
      .eq('role', 'sub_admin')
      .order('created_at', { ascending: false })
    if (data) setSubAdmins(data)
    setLoading(false)
  }

  useEffect(() => { fetchSubAdmins() }, [])

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return q ? subAdmins.filter((u) => u.username.includes(q) || (u.display_name || '').toLowerCase().includes(q)) : subAdmins
  }, [subAdmins, searchQuery])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const safePage = Math.min(currentPage, totalPages)
  const pageRows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize)

  async function toggleActive(userId: string, currentlyActive: boolean) {
    await supabase.from('profiles').update({ is_active: !currentlyActive, updated_at: new Date().toISOString() }).eq('id', userId)
    fetchSubAdmins()
  }

  async function deleteSubAdmin(userId: string, username: string) {
    if (!window.confirm(`Delete sub-admin "${username}"? This will NOT delete their retailers.`)) return
    const { error } = await supabase.rpc('admin_delete_user', { target_user_id: userId })
    if (error) { window.alert(`Failed: ${error.message}`); return }
    setSubAdmins((prev) => prev.filter((u) => u.id !== userId))
  }

  async function changePassword() {
    if (!pwModal) return
    setPwLoading(true)
    setPwError('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-update-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY}`, 'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY },
        body: JSON.stringify({ user_id: pwModal.userId }),
      })
      const json = await res.json()
      if (!res.ok || json.error) { setPwError(json.error || 'Failed'); setPwLoading(false); return }
      setNewPin(json.new_pin)
    } catch (err: any) { setPwError(err.message) }
    setPwLoading(false)
  }

  const thStyle: CSSProperties = { padding: '10px 12px', textAlign: 'left', whiteSpace: 'nowrap', borderBottom: '1px solid rgba(255,255,255,0.12)', ...labelFont, fontSize: 12 }
  const tdStyle: CSSProperties = { padding: '10px 12px', borderTop: `1px solid ${COLORS.tableBorder}`, fontSize: 13 }

  return (
    <div>
      <h1 style={{ ...labelFont, margin: '0 0 20px', fontSize: 26, fontWeight: 700, color: '#1a1a1a' }}>Sub-Admins</h1>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <label style={{ ...labelFont, fontSize: 14, color: '#333' }}>
          Search:{' '}
          <input type="search" value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1) }} style={{ marginLeft: 8, padding: '6px 10px', borderRadius: 6, border: `1px solid ${COLORS.tableBorder}`, minWidth: 200 }} />
        </label>
      </div>

      {loading ? <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>Loading...</div> : (
        <>
          <div style={{ overflowX: 'auto', background: '#fff', border: `1px solid ${COLORS.tableBorder}`, borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: COLORS.headerBg, color: '#fff' }}>
                  <th style={thStyle}>#</th>
                  <th style={thStyle}>Username</th>
                  <th style={thStyle}>Display Name</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Created At</th>
                  <th style={thStyle}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.length === 0 ? (
                  <tr><td colSpan={6} style={{ ...tdStyle, textAlign: 'center', color: '#888', padding: 32 }}>No sub-admins found</td></tr>
                ) : pageRows.map((u, idx) => (
                  <tr key={u.id} style={{ background: idx % 2 === 0 ? COLORS.rowAlt : '#fff', opacity: u.is_active ? 1 : 0.5 }}>
                    <td style={{ ...tdStyle, ...mono }}>{(safePage - 1) * pageSize + idx + 1}</td>
                    <td style={{ ...tdStyle, ...mono }}>{u.username}</td>
                    <td style={{ ...tdStyle, ...labelFont }}>{u.display_name || '—'}</td>
                    <td style={tdStyle}>
                      <span style={{ ...labelFont, fontSize: 12, padding: '3px 10px', borderRadius: 12, background: u.is_active ? '#e8f5e9' : '#ffebee', color: u.is_active ? '#2e7d32' : '#c62828', fontWeight: 600 }}>
                        {u.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={{ ...tdStyle, ...labelFont, fontSize: 12 }}>{new Date(u.created_at).toLocaleDateString()}</td>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button type="button" onClick={() => { setPwModal({ userId: u.id, username: u.username }); setNewPin(null); setPwError('') }} style={{ ...labelFont, fontSize: 12, padding: '5px 10px', borderRadius: 6, border: '1px solid #7c3aed', background: 'rgba(124,58,237,0.08)', color: '#7c3aed', cursor: 'pointer', fontWeight: 600 }}>Change PIN</button>
                        <button type="button" onClick={() => toggleActive(u.id, u.is_active)} style={{ ...labelFont, fontSize: 12, padding: '5px 10px', borderRadius: 6, border: `1px solid ${u.is_active ? '#c62828' : '#2e7d32'}`, background: u.is_active ? 'rgba(198,40,40,0.08)' : 'rgba(46,125,50,0.08)', color: u.is_active ? '#c62828' : '#2e7d32', cursor: 'pointer', fontWeight: 600 }}>
                          {u.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                        <button type="button" onClick={() => deleteSubAdmin(u.id, u.username)} style={{ ...labelFont, fontSize: 12, padding: '5px 10px', borderRadius: 6, border: 'none', background: '#e53935', color: '#fff', cursor: 'pointer', fontWeight: 600 }}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginTop: 16, ...labelFont, fontSize: 14, color: '#444' }}>
            <div>Showing {filtered.length === 0 ? 0 : (safePage - 1) * pageSize + 1} to {Math.min(safePage * pageSize, filtered.length)} of {filtered.length}</div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button type="button" disabled={safePage <= 1} onClick={() => setCurrentPage((p) => p - 1)} style={{ padding: '6px 12px', borderRadius: 6, border: `1px solid ${COLORS.tableBorder}`, background: safePage <= 1 ? '#eee' : '#fff', cursor: safePage <= 1 ? 'not-allowed' : 'pointer' }}>Previous</button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button key={p} type="button" onClick={() => setCurrentPage(p)} style={{ minWidth: 36, padding: '6px 10px', borderRadius: 20, border: 'none', background: p === safePage ? COLORS.pillBlue : 'transparent', color: p === safePage ? '#fff' : '#333', fontWeight: p === safePage ? 700 : 500, cursor: 'pointer' }}>{p}</button>
              ))}
              <button type="button" disabled={safePage >= totalPages} onClick={() => setCurrentPage((p) => p + 1)} style={{ padding: '6px 12px', borderRadius: 6, border: `1px solid ${COLORS.tableBorder}`, background: safePage >= totalPages ? '#eee' : '#fff', cursor: safePage >= totalPages ? 'not-allowed' : 'pointer' }}>Next</button>
            </div>
          </div>
        </>
      )}

      {pwModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'grid', placeItems: 'center', zIndex: 999 }} onClick={() => setPwModal(null)}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, padding: 32, maxWidth: 400, width: '90%', textAlign: 'center', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
            {newPin ? (
              <>
                <div style={{ fontSize: 48, marginBottom: 8 }}>🔑</div>
                <h2 style={{ ...labelFont, margin: '0 0 8px', fontSize: 20 }}>New PIN for {pwModal.username}</h2>
                <p style={{ ...labelFont, color: '#e53935', fontSize: 13, fontWeight: 600 }}>⚠ Shown only once</p>
                <div style={{ ...mono, fontSize: 32, fontWeight: 700, color: '#e53935', letterSpacing: 6, margin: '16px 0 24px', background: '#fff5f5', padding: 16, borderRadius: 10 }}>{newPin}</div>
                <button type="button" onClick={() => setPwModal(null)} style={{ ...labelFont, padding: '10px 32px', borderRadius: 8, border: 'none', background: '#1976d2', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>Close</button>
              </>
            ) : (
              <>
                <h2 style={{ ...labelFont, margin: '0 0 16px', fontSize: 20 }}>Change PIN for {pwModal.username}?</h2>
                <p style={{ ...labelFont, color: '#666', fontSize: 13, marginBottom: 20 }}>A new random 6-digit PIN will be generated.</p>
                {pwError && <div style={{ color: '#e53935', fontSize: 13, marginBottom: 12 }}>{pwError}</div>}
                <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                  <button type="button" onClick={() => setPwModal(null)} style={{ ...labelFont, padding: '10px 24px', borderRadius: 8, border: '1px solid #ccc', background: '#fff', cursor: 'pointer' }}>Cancel</button>
                  <button type="button" onClick={changePassword} disabled={pwLoading} style={{ ...labelFont, padding: '10px 24px', borderRadius: 8, border: 'none', background: pwLoading ? '#999' : '#7c3aed', color: '#fff', fontWeight: 600, cursor: pwLoading ? 'not-allowed' : 'pointer' }}>{pwLoading ? 'Generating...' : 'Generate New PIN'}</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
