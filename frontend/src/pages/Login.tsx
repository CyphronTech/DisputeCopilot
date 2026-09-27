import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { createAdminAccount, getAuthStatus, login } from '../api/client'
import { Icon } from '../components/Icon'

const MIN_PASSWORD_LENGTH = 8

export function Login() {
  const navigate = useNavigate()
  const [mode, setMode] = useState<'checking' | 'create' | 'signin'>('checking')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    getAuthStatus()
      .then((s) => setMode(s.passwordSet ? 'signin' : 'create'))
      .catch((e) => {
        setMode('signin')
        setError(e instanceof Error ? e.message : String(e))
      })
  }, [])

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const form = new FormData(e.currentTarget)
    const email = String(form.get('email')).trim()
    const password = String(form.get('password'))
    if (mode === 'create') {
      if (password.length < MIN_PASSWORD_LENGTH) return setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`)
      if (password !== String(form.get('confirm'))) return setError("The two passwords don't match.")
    }
    setBusy(true)
    try {
      if (mode === 'create') await createAdminAccount(email, password)
      else await login(email, password)
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  const creating = mode === 'create'

  return (
    <div className="auth-wrap">
      <form className="card auth-card" onSubmit={handleSubmit}>
        <div className="auth-brand">
          <img className="brand-mark" src="/favicon.svg" alt="" />
          <div>
            <h1 className="auth-title">{creating ? 'Create your password' : 'Sign in to DisputeCopilot'}</h1>
            {creating && (
              <p className="auth-sub">First time here — choose the email and password you'll use to sign in.</p>
            )}
          </div>
        </div>

        {mode !== 'checking' && (
          <>
            <div className="field">
              <label htmlFor="login-email">Email</label>
              <div className="input-wrap">
                <Icon name="user" />
                <input id="login-email" name="email" type={creating ? 'email' : 'text'} autoComplete="username" required autoFocus />
              </div>
            </div>
            <div className="field">
              <label htmlFor="login-password">Password</label>
              <div className="input-wrap">
                <Icon name="lock" />
                <input
                  id="login-password"
                  name="password"
                  type="password"
                  required
                  minLength={creating ? MIN_PASSWORD_LENGTH : undefined}
                  autoComplete={creating ? 'new-password' : 'current-password'}
                />
              </div>
            </div>
            {creating && (
              <div className="field">
                <label htmlFor="login-confirm">Confirm password</label>
                <div className="input-wrap">
                  <Icon name="lock" />
                  <input id="login-confirm" name="confirm" type="password" required autoComplete="new-password" />
                </div>
              </div>
            )}
            <div className="field-row">
              <span style={{ color: 'var(--text-3)' }}>
                {creating ? `At least ${MIN_PASSWORD_LENGTH} characters. You can change it later in Setup.` : 'Session expires after 12h idle'}
              </span>
            </div>
          </>
        )}
        {error && <div role="alert" style={{ color: 'var(--error)', fontSize: 13 }}>{error}</div>}
        <button className="btn btn-primary" type="submit" disabled={busy || mode === 'checking'}>
          {creating ? 'Create password and sign in' : 'Sign in'}
        </button>
      </form>
      <div className="auth-foot">
        Your data stays on this computer, except what's sent to the AI provider you choose in Setup.
      </div>
    </div>
  )
}
