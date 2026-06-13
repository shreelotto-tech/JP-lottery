import { useState, type CSSProperties, type FormEvent } from 'react'
import { supabase } from '../../lib/supabase'

const labelFont: CSSProperties = { fontFamily: "'Inter', sans-serif" }
const mono: CSSProperties = { fontFamily: "'JetBrains Mono', monospace" }

export default function CreateSubAdmin() {
  const [displayName, setDisplayName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<{ username: string; pin: string } | null>(null)
  const [copied, setCopied] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (!displayName.trim()) {
      setError('Display name is required')
      return
    }
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-create-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ display_name: displayName.trim(), role: 'sub_admin' }),
      })
      const json = await res.json()
      if (!res.ok || json.error) { setError(json.error || 'Failed to create sub-admin'); setLoading(false); return }
      setResult({ username: json.username, pin: json.pin })
      setDisplayName('')
      setCopied(false)
    } catch (err: any) {
      setError(err.message || 'Network error')
    }
    setLoading(false)
  }

  function handleCopy() {
    if (!result) return
    navigator.clipboard.writeText(`Username: ${result.username}\nPassword: ${result.pin}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const inputStyle: CSSProperties = { width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #d0d0d0', fontSize: 14, outline: 'none', ...labelFont }

  return (
    <div>
      <h1 style={{ ...labelFont, margin: '0 0 8px', fontSize: 26, fontWeight: 700, color: '#1a1a1a' }}>Create Sub-Admin</h1>
      <p style={{ ...labelFont, fontSize: 14, color: '#666', margin: '0 0 24px' }}>Sub-admins can create and manage their own retailers.</p>

      <div style={{ background: '#fff', borderRadius: 12, padding: 28, maxWidth: 500, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 20 }}>
            <label style={{ ...labelFont, fontSize: 13, fontWeight: 600, color: '#555', display: 'block', marginBottom: 6 }}>Display Name *</label>
            <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Enter name" style={inputStyle} />
          </div>
          {error && <div style={{ color: '#e53935', fontSize: 13, marginBottom: 12 }}>{error}</div>}
          <button type="submit" disabled={loading} style={{ ...labelFont, width: '100%', padding: '12px', borderRadius: 8, border: 'none', background: loading ? '#999' : 'linear-gradient(135deg, #1976d2, #0d47a1)', color: '#fff', fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer' }}>
            {loading ? 'Creating...' : 'Create Sub-Admin'}
          </button>
        </form>
      </div>

      {result && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'grid', placeItems: 'center', zIndex: 999 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 32, maxWidth: 420, width: '90%', textAlign: 'center', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
            <h2 style={{ ...labelFont, margin: '0 0 8px', fontSize: 22 }}>Sub-Admin Created</h2>
            <p style={{ ...labelFont, color: '#e53935', fontSize: 13, marginBottom: 20, fontWeight: 600 }}>⚠ Shown only once. Save these credentials now.</p>
            <div style={{ background: '#eff6ff', borderRadius: 10, padding: 20, marginBottom: 20, position: 'relative' }}>
              <div style={{ marginBottom: 12 }}>
                <span style={{ ...labelFont, fontSize: 13, color: '#666' }}>Username</span>
                <div style={{ ...mono, fontSize: 28, fontWeight: 700, color: '#1976d2', letterSpacing: 4 }}>{result.username}</div>
              </div>
              <div>
                <span style={{ ...labelFont, fontSize: 13, color: '#666' }}>PIN</span>
                <div style={{ ...mono, fontSize: 28, fontWeight: 700, color: '#e53935', letterSpacing: 4 }}>{result.pin}</div>
              </div>
              <button type="button" onClick={handleCopy} style={{ ...labelFont, position: 'absolute', top: 12, right: 12, padding: '6px 12px', borderRadius: 6, border: '1px solid #1976d2', background: copied ? '#1976d2' : 'rgba(25,118,210,0.08)', color: copied ? '#fff' : '#1976d2', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <button type="button" onClick={() => setResult(null)} style={{ ...labelFont, padding: '10px 32px', borderRadius: 8, border: 'none', background: '#1976d2', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: 14 }}>
              I've Saved This — Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
