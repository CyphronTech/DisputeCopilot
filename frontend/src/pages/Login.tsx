import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { login } from '../api/client'
import { Icon } from '../components/Icon'

export function Login() {
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const form = new FormData(e.currentTarget)
    try {
      await login(String(form.get('email')), String(form.get('password')))
      navigate('/')
    } catch {
      setError('Invalid email or password')
    }
  }

  return (
    <div className="auth-wrap">
      <form className="card auth-card" onSubmit={handleSubmit}>
        <div className="auth-brand">
          <div className="brand-mark">DC</div>
          <div>
            <h1 className="auth-title">Sign in to DisputeCopilot</h1>
            <p className="auth-sub">Northwind Retail · self-hosted deployment</p>
          </div>
        </div>

        <div className="field">
          <label>Email</label>
          <div className="input-wrap">
            <Icon name="user" />
            <input name="email" defaultValue="admin@disputecopilot.local" />
          </div>
        </div>
        <div className="field">
          <label>Password</label>
          <div className="input-wrap">
            <Icon name="lock" />
            <input name="password" type="password" />
          </div>
        </div>
        <div className="field-row">
          <span style={{ color: 'var(--text-3)' }}>Session expires after 12h idle</span>
          <a href="#forgot">Forgot?</a>
        </div>
        {error && <div style={{ color: 'var(--danger, #d33)', fontSize: 13 }}>{error}</div>}
        <button className="btn btn-primary" type="submit">
          Sign in
        </button>

        <div className="env-chip">
          <span className="dot" />
          Connected to local instance · v0.4.0
        </div>
      </form>
      <div className="auth-foot">Data stays on this machine. Nothing is sent to CyphronTech.</div>
    </div>
  )
}
