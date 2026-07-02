
import React, { useState } from 'react'
import { signIn, getCurrentProfile } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { Icons } from '../components/UI'

export default function Login() {
  const { setUser } = useAuth()
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async e => {
    e.preventDefault()
    setErr('')
    setLoading(true)

    try {
      await signIn(email, pw)
      const p = await getCurrentProfile()
      setUser(p)
    } catch (e) {
      setErr(e.message || 'Invalid email or password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div style={{ marginBottom: 26, textAlign: 'center' }}>
          <div
            style={{
              fontSize: 19,
              fontWeight: 700,
              color: 'var(--sky-900)'
            }}
          >
            MC Nursing Simulation Lab
          </div>
          <div
            style={{
              fontSize: 12,
              color: 'var(--sl-400)'
            }}
          >
            Inventory Management System
          </div>
        </div>

        <form onSubmit={submit}>
          <div className="ff">
            <label className="fl">Email Address</label>
            <input
              className="fi"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@simlab.edu"
              required
              autoFocus
            />
          </div>

          <div className="ff">
            <label className="fl">Password</label>
            <input
              className="fi"
              type="password"
              value={pw}
              onChange={e => setPw(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          {err && (
            <div className="alert alert-danger">
              {Icons.alert}
              <span>{err}</span>
            </div>
          )}

          <button
            className="btn btn-primary"
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              justifyContent: 'center',
              padding: '10px'
            }}
          >
            {loading ? (
              <>
                <div className="spin" />
                Signing in…
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
