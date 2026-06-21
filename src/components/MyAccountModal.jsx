import React, { useState } from 'react'
import { updateUserPassword } from '../lib/db'
import { Icons, Modal, Field, Inp } from './UI'
import toast from 'react-hot-toast'

// Available to ANY logged-in user, regardless of role —
// every user must be able to change their own password.
export default function MyAccountModal({ profile, onClose }) {
  const [pwForm, setPwForm] = useState({ password: '', confirmPassword: '' })
  const [saving, setSaving] = useState(false)
  const [showPw, setShowPw] = useState(false)

  const save = async e => {
    e.preventDefault()
    if (pwForm.password !== pwForm.confirmPassword) { toast.error('Passwords do not match'); return }
    if (pwForm.password.length < 6) { toast.error('Min 6 characters'); return }
    setSaving(true)
    try {
      // userId === own id — the edge function allows self-password-changes
      // regardless of role (see manage-user/index.ts: userId === caller.id bypass)
      await updateUserPassword(profile.id, pwForm.password)
      toast.success('Password changed successfully')
      onClose()
    } catch (e) { toast.error(e.message) } finally { setSaving(false) }
  }

  return (
    <Modal title="My Account" onClose={onClose}
      footer={
        <><button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={() => document.getElementById('my-pw-form').requestSubmit()} disabled={saving}>
            {saving ? <div className="spin" /> : Icons.check} Change Password
          </button></>
      }>
      <div style={{ marginBottom: 16, padding: '10px 13px', background: 'var(--sky-50)', borderRadius: 8, border: '1px solid var(--sky-100)' }}>
        <div style={{ fontSize: 12, color: 'var(--sl-400)', fontWeight: 600 }}>Signed in as</div>
        <div style={{ fontWeight: 700, color: 'var(--sky-900)' }}>{profile.name}</div>
        <div style={{ fontSize: 12, color: 'var(--sl-500)' }}>{profile.email}</div>
      </div>
      <form id="my-pw-form" onSubmit={save}>
        <Field label="New Password *" note="min 6 characters">
          <div style={{ position: 'relative' }}>
            <Inp
              type={showPw ? 'text' : 'password'}
              value={pwForm.password}
              onChange={e => setPwForm(p => ({ ...p, password: e.target.value }))}
              placeholder="••••••••"
              required
            />
            <button type="button" onClick={() => setShowPw(p => !p)}
              style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--sl-400)', cursor: 'pointer', fontSize: 11 }}>
              {showPw ? 'Hide' : 'Show'}
            </button>
          </div>
        </Field>
        <Field label="Confirm New Password *">
          <Inp
            type={showPw ? 'text' : 'password'}
            value={pwForm.confirmPassword}
            onChange={e => setPwForm(p => ({ ...p, confirmPassword: e.target.value }))}
            placeholder="••••••••"
            required
          />
        </Field>
        {pwForm.password && pwForm.confirmPassword && pwForm.password !== pwForm.confirmPassword && (
          <div className="alert alert-danger">{Icons.alert}<span>Passwords do not match</span></div>
        )}
      </form>
    </Modal>
  )
}
