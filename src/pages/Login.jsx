import React, { useState } from 'react'
import { signIn, getCurrentProfile } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { Icons } from '../components/UI'
import logo from '../assets/logo'

export default function Login() {
  const { setUser } = useAuth()
  const [email, setEmail]     = useState('')
  const [pw, setPw]           = useState('')
  const [err, setErr]         = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async e => {
    e.preventDefault(); setErr(''); setLoading(true)
    try { await signIn(email, pw); const p = await getCurrentProfile(); setUser(p) }
    catch (e) { setErr(e.message || 'Invalid email or password') }
    finally { setLoading(false) }
  }

  return (
    <div className="login-page">
      <div className="login-card">

        {/* Logo + brand block */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <img
            src={logo}
            alt="Streakk"
            style={{ height: 42, objectFit: 'contain', display: 'block', margin: '0 auto 12px' }}
          />
          {/* Divider line */}
          <div style={{ height: 1, background: 'var(--sl-100)', margin: '0 auto 12px', width: 60 }} />
          <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--sky-700)' }}>
            Inventory Management
          </div>
          <div style={{ fontSize: 11, color: 'var(--sl-400)', marginTop: 3 }}>
            Simulation Lab System
          </div>
        </div>

        <form onSubmit={submit}>
          <div className="ff">
            <label className="fl">Email Address</label>
            <input className="fi" type="email" value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@simlab.edu" required autoFocus />
          </div>
          <div className="ff">
            <label className="fl">Password</label>
            <input className="fi" type="password" value={pw}
              onChange={e => setPw(e.target.value)}
              placeholder="••••••••" required />
          </div>
          {err && (
            <div className="alert alert-danger">{Icons.alert}<span>{err}</span></div>
          )}
          <button className="btn btn-primary" type="submit" disabled={loading}
            style={{ width: '100%', justifyContent: 'center', padding: '10px', marginTop: 4 }}>
            {loading ? <><div className="spin" /> Signing in…</> : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  )
}
