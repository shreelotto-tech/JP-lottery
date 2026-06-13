import { useState, type CSSProperties, type FormEvent } from 'react'
import { supabase } from '../../lib/supabase'

const labelFont: CSSProperties = { fontFamily: "'Inter', sans-serif" }
const mono: CSSProperties = { fontFamily: "'JetBrains Mono', monospace" }

export default function CreateUser() {
  const [displayName, setDisplayName] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [initialPoints, setInitialPoints] = useState('')
  const [percentage, setPercentage] = useState('10')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<{ username: string; pin: string } | null>(null)
  const [copied, setCopied] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (!displayName.trim() || !phoneNumber.trim() || !initialPoints.trim()) {
      setError('All fields are required')
      return
    }
    const pts = Number(initialPoints)
    if (isNaN(pts) || pts < 0) { setError('Initial points must be a non-negative number'); return }
    const pct = Number(percentage)
    if (isNaN(pct) || pct < 0 || pct > 100) { setError('Percentage must be between 0 and 100'); return }

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
        body: JSON.stringify({ display_name: displayName.trim(), phone_number: phoneNumber.trim(), initial_points: pts, percentage: pct }),
      })
      const json = await res.json()
      if (!res.ok || json.error) { setError(json.error || 'Failed to create user'); setLoading(false); return }
      setResult({ username: json.username, pin: json.pin })
      setDisplayName('')
      setPhoneNumber('')
      setInitialPoints('')
      setPercentage('10')
      setCopied(false)
    } catch (err: any) {
      setError(err.message || 'Network error')
    }
    setLoading(false)
  }

  function handleCopy() {
    if (!result) return
    const text = `Username: ${result.username}\nPassword: ${result.pin}`
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const inputStyle: CSSProperties = { width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #d0d0d0', fontSize: 14, outline: 'none', ...labelFont }

  return (
    <div>
      <h1 style={{ ...labelFont, margin: '0 0 24px', fontSize: 26, fontWeight: 700, color: '#1a1a1a' }}>Create User</h1>

      <div style={{ background: '#fff', borderRadius: 12, padding: 28, maxWidth: 500, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ ...labelFont, fontSize: 13, fontWeight: 600, color: '#555', display: 'block', marginBottom: 6 }}>Display Name *</label>
            <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Enter display name" style={inputStyle} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ ...labelFont, fontSize: 13, fontWeight: 600, color: '#555', display: 'block', marginBottom: 6 }}>Phone Number *</label>
            <input value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} placeholder="Enter phone number" style={inputStyle} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ ...labelFont, fontSize: 13, fontWeight: 600, color: '#555', display: 'block', marginBottom: 6 }}>Initial Points *</label>
            <input type="number" min="0" value={initialPoints} onChange={(e) => setInitialPoints(e.target.value)} placeholder="e.g. 500" style={inputStyle} />
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ ...labelFont, fontSize: 13, fontWeight: 600, color: '#555', display: 'block', marginBottom: 6 }}>Percentage (%) *</label>
            <input type="number" min="0" max="100" value={percentage} onChange={(e) => setPercentage(e.target.value)} placeholder="e.g. 10" style={inputStyle} />
          </div>
          {error && <div style={{ color: '#e53935', fontSize: 13, marginBottom: 12 }}>{error}</div>}
          <button type="submit" disabled={loading} style={{ ...labelFont, width: '100%', padding: '12px', borderRadius: 8, border: 'none', background: loading ? '#999' : 'linear-gradient(135deg, #7c3aed, #5b21b6)', color: '#fff', fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer' }}>
            {loading ? 'Creating...' : 'Create User'}
          </button>
        </form>
      </div>

      {/* One-time result modal */}
      {result && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'grid', placeItems: 'center', zIndex: 999 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 32, maxWidth: 420, width: '90%', textAlign: 'center', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
            <h2 style={{ ...labelFont, margin: '0 0 8px', fontSize: 22 }}>User Created Successfully</h2>
            <p style={{ ...labelFont, color: '#e53935', fontSize: 13, marginBottom: 20, fontWeight: 600 }}>⚠ This information is shown only once. Please save it now.</p>
            <div style={{ background: '#f5f0ff', borderRadius: 10, padding: 20, marginBottom: 20, position: 'relative' }}>
              <div style={{ marginBottom: 12 }}>
                <span style={{ ...labelFont, fontSize: 13, color: '#666' }}>Username</span>
                <div style={{ ...mono, fontSize: 28, fontWeight: 700, color: '#5b21b6', letterSpacing: 4 }}>{result.username}</div>
              </div>
              <div>
                <span style={{ ...labelFont, fontSize: 13, color: '#666' }}>PIN</span>
                <div style={{ ...mono, fontSize: 28, fontWeight: 700, color: '#e53935', letterSpacing: 4 }}>{result.pin}</div>
              </div>
              <button 
                type="button" 
                onClick={handleCopy} 
                style={{ ...labelFont, position: 'absolute', top: 12, right: 12, padding: '6px 12px', borderRadius: 6, border: '1px solid #7c3aed', background: copied ? '#7c3aed' : 'rgba(124,58,237,0.08)', color: copied ? '#fff' : '#7c3aed', cursor: 'pointer', fontSize: 12, fontWeight: 600, transition: 'all 0.2s' }}
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <button type="button" onClick={() => setResult(null)} style={{ ...labelFont, padding: '10px 32px', borderRadius: 8, border: 'none', background: '#5b21b6', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: 14 }}>
              I've Saved This — Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
