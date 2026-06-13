import { useState, type CSSProperties, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from './lib/supabase'

type FormState = {
  username: string
  password: string
}

const COLORS = {
  bgStart: '#f7efe3',
  bgEnd: '#ffd7b3',
  card: '#fff8f2',
  border: '#f1d8bf',
  title: '#2f1c0f',
  subtitle: '#6b4a32',
  inputBg: '#ffffff',
  inputBorder: '#d7b79b',
  buttonStart: '#f26b21',
  buttonEnd: '#c44714',
  buttonText: '#fffaf5',
  link: '#8a5128',
} as const

export default function SignInPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState<FormState>({ username: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  function updateField(key: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')

    if (!form.username || !form.password) {
      setError('Please enter both username and password')
      return
    }

    setLoading(true)

    // The auth architecture requires `{username}@internal.app`
    const email = `${form.username}@internal.app`

    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password: form.password,
    })

    if (signInError) {
      setError(signInError.message)
      setLoading(false)
      return
    }

    // Security check: only super_admin and sub_admin profiles may access this panel
    const userId = signInData.user?.id
    if (!userId) {
      await supabase.auth.signOut()
      setError('Sign-in failed. Please try again.')
      setLoading(false)
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single()

    if (!profile || (profile.role !== 'super_admin' && profile.role !== 'sub_admin')) {
      await supabase.auth.signOut()
      setError('Access denied. You do not have admin privileges.')
      setLoading(false)
      return
    }

    setLoading(false)
    navigate('/dashboard')
  }

  return (
    <div style={styles.page}>
      <div style={styles.glowLeft} aria-hidden />
      <div style={styles.glowRight} aria-hidden />

      <form style={styles.card} onSubmit={handleSubmit}>
        <p style={{ ...styles.brand, fontWeight: 900 }}>J.P Admin</p>
        <h1 style={styles.heading}>Sign In</h1>
        <p style={styles.subheading}>Continue to your dashboard</p>

        <label style={styles.label} htmlFor="username">
          Username (4-digit PIN)
        </label>
        <input
          id="username"
          name="username"
          value={form.username}
          onChange={(e) => updateField('username', e.target.value)}
          placeholder="Enter username"
          style={styles.input}
          autoComplete="username"
        />

        <label style={styles.label} htmlFor="password">
          Password
        </label>
        <div style={{ position: 'relative' }}>
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            value={form.password}
            onChange={(e) => updateField('password', e.target.value)}
            placeholder="Enter password"
            style={{ ...styles.input, width: '100%', paddingRight: '40px' }}
            autoComplete="current-password"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            style={{
              position: 'absolute',
              right: '12px',
              top: '12px',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              fontSize: '16px',
              opacity: 0.6,
              padding: 0
            }}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? '👁️' : '👁️‍🗨️'}
          </button>
        </div>

        {error && (
          <div style={{ color: '#c62828', fontSize: '13px', marginBottom: '12px', background: '#ffebee', padding: '8px 12px', borderRadius: '8px', border: '1px solid #ef9a9a' }}>
            {error}
          </div>
        )}

        <button type="submit" disabled={loading} style={{ ...styles.button, opacity: loading ? 0.7 : 1 }}>
          {loading ? 'Signing In...' : 'Sign In'}
        </button>
      </form>
    </div>
  )
}

const styles: Record<string, CSSProperties> = {
  page: {
    minHeight: '100vh',
    display: 'grid',
    placeItems: 'center',
    position: 'relative',
    overflow: 'hidden',
    background: `linear-gradient(130deg, ${COLORS.bgStart} 0%, ${COLORS.bgEnd} 100%)`,
    padding: '20px',
    fontFamily: '"Trebuchet MS", "Segoe UI", sans-serif',
  },
  card: {
    width: '100%',
    maxWidth: '420px',
    borderRadius: '20px',
    background: COLORS.card,
    border: `1px solid ${COLORS.border}`,
    boxShadow: '0 20px 45px rgba(94, 47, 18, 0.15)',
    padding: '28px',
    position: 'relative',
    zIndex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  brand: {
    margin: 0,
    color: COLORS.link,
    fontSize: '13px',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    fontWeight: 700,
  },
  heading: {
    margin: '10px 0 4px',
    color: COLORS.title,
    fontSize: '34px',
    lineHeight: 1.1,
  },
  subheading: {
    margin: '0 0 20px',
    color: COLORS.subtitle,
    fontSize: '14px',
  },
  label: {
    marginBottom: '6px',
    color: COLORS.subtitle,
    fontWeight: 600,
    fontSize: '13px',
  },
  input: {
    marginBottom: '14px',
    height: '42px',
    borderRadius: '10px',
    border: `1px solid ${COLORS.inputBorder}`,
    background: COLORS.inputBg,
    padding: '0 12px',
    color: COLORS.title,
    outline: 'none',
    fontSize: '14px',
    boxSizing: 'border-box',
    width: '100%',
  },
  button: {
    marginTop: '8px',
    height: '44px',
    borderRadius: '10px',
    border: 'none',
    background: `linear-gradient(135deg, ${COLORS.buttonStart} 0%, ${COLORS.buttonEnd} 100%)`,
    color: COLORS.buttonText,
    fontSize: '15px',
    fontWeight: 700,
    cursor: 'pointer',
  },
  glowLeft: {
    position: 'absolute',
    left: '-120px',
    top: '-120px',
    width: '320px',
    height: '320px',
    borderRadius: '999px',
    background: 'rgba(243, 132, 56, 0.22)',
    filter: 'blur(14px)',
  },
  glowRight: {
    position: 'absolute',
    right: '-140px',
    bottom: '-130px',
    width: '340px',
    height: '340px',
    borderRadius: '999px',
    background: 'rgba(214, 97, 30, 0.2)',
    filter: 'blur(16px)',
  },
}
