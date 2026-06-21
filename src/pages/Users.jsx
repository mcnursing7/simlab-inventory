import React, { useState, useEffect } from 'react'
import { getProfiles, updateProfile, createUser, updateUserPassword, updateUserEmail } from '../lib/db'
import { useAuth } from '../hooks/useAuth'
import { Icons, Modal, Confirm, Field, Inp, Sel, fmtDate, ROLES, ROLE_CLS, initials } from '../components/UI'
import toast from 'react-hot-toast'

// Role hierarchy — higher number = higher privilege
const RANK = { admin: 3, manager: 2, lab_staff: 1 }

// Can `actor` manage (edit/deactivate) `target`?
// Rule: actor's rank must be STRICTLY GREATER than target's rank.
// Equal rank (e.g. manager vs manager) cannot manage each other.
function canManage(actorRole, targetRole) {
  return RANK[actorRole] > RANK[targetRole]
}

// ── Add User Modal ─────────────────────────────────────────────
function AddUserModal({ onClose, onSaved, actorRole }) {
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '', role: 'lab_staff' })
  const [saving, setSaving] = useState(false)
  const [showPw, setShowPw] = useState(false)
  const f = k => e => setForm(p => ({ ...p, [k]: e.target.value }))

  const assignableRoles = Object.keys(RANK).filter(r => RANK[actorRole] > RANK[r])

  const save = async e => {
    e.preventDefault()
    if (form.password !== form.confirmPassword) { toast.error('Passwords do not match'); return }
    if (form.password.length < 6) { toast.error('Password must be at least 6 characters'); return }
    setSaving(true)
    try {
      await createUser(form.name, form.email, form.password, form.role)
      toast.success(`User "${form.name}" created`)
      onSaved()
      onClose()
    } catch (e) { toast.error(e.message) } finally { setSaving(false) }
  }

  return (
    <Modal title="Add New User" onClose={onClose}
      footer={
        <><button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={() => document.getElementById('add-user-form').requestSubmit()} disabled={saving}>
            {saving ? <div className="spin" /> : Icons.check} Create User
          </button></>
      }>
      <form id="add-user-form" onSubmit={save}>
        <Field label="Full Name *">
          <Inp value={form.name} onChange={f('name')} placeholder="Jane Smith" required />
        </Field>
        <Field label="Email Address *">
          <Inp type="email" value={form.email} onChange={f('email')} placeholder="jane@simlab.edu" required />
        </Field>
        <Field label="Role *">
          <Sel value={form.role} onChange={f('role')} required>
            {assignableRoles.map(r => <option key={r} value={r}>{ROLES[r]}</option>)}
          </Sel>
        </Field>
        <div style={{ height: 1, background: 'var(--sl-100)', margin: '4px 0 14px' }} />
        <Field label="Initial Password *" note="min 6 characters — user can change this after logging in">
          <div style={{ position: 'relative' }}>
            <Inp type={showPw ? 'text' : 'password'} value={form.password} onChange={f('password')} placeholder="••••••••" required />
            <button type="button" onClick={() => setShowPw(p => !p)}
              style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--sl-400)', cursor: 'pointer', fontSize: 11 }}>
              {showPw ? 'Hide' : 'Show'}
            </button>
          </div>
        </Field>
        <Field label="Confirm Password *">
          <Inp type={showPw ? 'text' : 'password'} value={form.confirmPassword} onChange={f('confirmPassword')} placeholder="••••••••" required />
        </Field>
        {form.password && form.confirmPassword && form.password !== form.confirmPassword && (
          <div className="alert alert-danger">{Icons.alert}<span>Passwords do not match</span></div>
        )}
        <div className="alert alert-info" style={{ marginTop: 8, marginBottom: 0 }}>
          {Icons.info}
          <span>The user can change their own password after logging in, or someone with permission can reset it later from this page.</span>
        </div>
      </form>
    </Modal>
  )
}

// ── Edit User Modal ────────────────────────────────────────────
function EditUserModal({ profile, onClose, onSaved, actorRole }) {
  const [tab, setTab] = useState('details')
  const [form, setForm]       = useState({ name: profile.name, role: profile.role })
  const [pwForm, setPwForm]   = useState({ password: '', confirmPassword: '' })
  const [emailForm, setEmailForm] = useState({ email: profile.email || '' })
  const [saving, setSaving]   = useState(false)
  const [showPw, setShowPw]   = useState(false)

  const assignableRoles = Object.keys(RANK).filter(r => RANK[actorRole] > RANK[r])

  const saveDetails = async e => {
    e.preventDefault(); setSaving(true)
    try {
      await updateProfile(profile.id, { name: form.name, role: form.role })
      toast.success('Details updated'); onSaved()
    } catch (e) { toast.error(e.message) } finally { setSaving(false) }
  }

  const savePassword = async e => {
    e.preventDefault()
    if (pwForm.password !== pwForm.confirmPassword) { toast.error('Passwords do not match'); return }
    if (pwForm.password.length < 6) { toast.error('Min 6 characters'); return }
    setSaving(true)
    try {
      await updateUserPassword(profile.id, pwForm.password)
      toast.success('Password updated')
      setPwForm({ password: '', confirmPassword: '' })
    } catch (e) { toast.error(e.message) } finally { setSaving(false) }
  }

  const saveEmail = async e => {
    e.preventDefault(); setSaving(true)
    try {
      await updateUserEmail(profile.id, emailForm.email)
      toast.success('Email updated'); onSaved()
    } catch (e) { toast.error(e.message) } finally { setSaving(false) }
  }

  return (
    <Modal title={`Edit: ${profile.name}`} onClose={onClose}>
      <div className="tab-bar">
        {['details', 'reset password', 'email'].map(t => (
          <div key={t} className={`tab${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}
            style={{ textTransform: 'capitalize' }}>{t}</div>
        ))}
      </div>

      {tab === 'details' && (
        <form onSubmit={saveDetails}>
          <Field label="Full Name *">
            <Inp value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required />
          </Field>
          <Field label="Role *">
            <Sel value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))} required>
              {assignableRoles.map(r => <option key={r} value={r}>{ROLES[r]}</option>)}
            </Sel>
          </Field>
          <div className="modal-footer" style={{ margin: '8px -22px -18px', padding: '14px 22px' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? <div className="spin" /> : Icons.check} Save Details
            </button>
          </div>
        </form>
      )}

      {tab === 'reset password' && (
        <form onSubmit={savePassword}>
          <div className="alert alert-info">
            {Icons.info}<span>Set a new password for <strong>{profile.name}</strong>. They can log in immediately with it.</span>
          </div>
          <Field label="New Password *" note="min 6 characters">
            <div style={{ position: 'relative' }}>
              <Inp type={showPw ? 'text' : 'password'} value={pwForm.password} onChange={e => setPwForm(p => ({ ...p, password: e.target.value }))} placeholder="••••••••" required />
              <button type="button" onClick={() => setShowPw(p => !p)}
                style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--sl-400)', cursor: 'pointer', fontSize: 11 }}>
                {showPw ? 'Hide' : 'Show'}
              </button>
            </div>
          </Field>
          <Field label="Confirm New Password *">
            <Inp type={showPw ? 'text' : 'password'} value={pwForm.confirmPassword} onChange={e => setPwForm(p => ({ ...p, confirmPassword: e.target.value }))} placeholder="••••••••" required />
          </Field>
          {pwForm.password && pwForm.confirmPassword && pwForm.password !== pwForm.confirmPassword && (
            <div className="alert alert-danger">{Icons.alert}<span>Passwords do not match</span></div>
          )}
          <div className="modal-footer" style={{ margin: '8px -22px -18px', padding: '14px 22px' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? <div className="spin" /> : Icons.check} Reset Password
            </button>
          </div>
        </form>
      )}

      {tab === 'email' && (
        <form onSubmit={saveEmail}>
          <div className="alert alert-info">{Icons.info}<span>Current: <strong>{profile.email || '—'}</strong></span></div>
          <Field label="New Email Address *">
            <Inp type="email" value={emailForm.email} onChange={e => setEmailForm({ email: e.target.value })} required />
          </Field>
          <div className="modal-footer" style={{ margin: '8px -22px -18px', padding: '14px 22px' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? <div className="spin" /> : Icons.check} Update Email
            </button>
          </div>
        </form>
      )}
    </Modal>
  )
}

// ── Main Users Page ────────────────────────────────────────────
// Note: "Change My Password" lives in the sidebar "My Account" button
// (src/components/MyAccountModal.jsx) — available to every role there,
// not just admins/managers who can see this page.
export default function Users() {
  const { user } = useAuth()
  const [profiles, setProfiles] = useState([])
  const [loading, setLoading]   = useState(true)
  const [addModal, setAddModal] = useState(false)
  const [editModal, setEditModal]   = useState(null)
  const [confirm, setConfirm]       = useState(null)

  const load = () => {
    setLoading(true)
    getProfiles().then(setProfiles).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const isSelf  = (p) => p.id === user.id
  const allowed = (p) => !isSelf(p) && canManage(user.role, p.role)

  const toggle = p => {
    if (!allowed(p)) return
    setConfirm({
      msg: `${p.active ? 'Deactivate' : 'Activate'} "${p.name}"? ${p.active ? 'They will not be able to log in.' : 'They will be able to log in again.'}`,
      onYes: async () => {
        await updateProfile(p.id, { active: !p.active })
        await load()
        setConfirm(null)
        toast.success(p.active ? 'User deactivated' : 'User activated')
      }
    })
  }

  if (loading) return <div className="loading-page"><div className="spin" /><span>Loading users…</span></div>

  const canAddAnyone = Object.keys(RANK).some(r => RANK[user.role] > RANK[r])

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        {canAddAnyone && (
          <button className="btn btn-primary" onClick={() => setAddModal(true)}>
            {Icons.plus} Add User
          </button>
        )}
      </div>

      <div className="card">
        <div className="table-wrap">
          <table className="dt">
            <thead><tr>
              <th>User</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th className="hide-mobile">Joined</th>
              <th>Actions</th>
            </tr></thead>
            <tbody>
              {profiles.map(p => {
                const editable = allowed(p)
                return (
                  <tr key={p.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                        <div className="avatar">{initials(p.name)}</div>
                        <div>
                          <div style={{ fontWeight: 700 }}>{p.name}</div>
                          {isSelf(p) && (
                            <div style={{ fontSize: 10, color: 'var(--sky-600)', fontWeight: 600 }}>You</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td style={{ color: 'var(--sl-500)', fontSize: 13 }}>{p.email || '—'}</td>
                    <td><span className={`badge ${ROLE_CLS[p.role] || 'badge-slate'}`}>{ROLES[p.role] || p.role}</span></td>
                    <td>
                      <span className={`badge ${p.active ? 'badge-green' : 'badge-red'}`}>
                        <span className="bdot" style={{ background: p.active ? 'var(--green-600)' : 'var(--red-600)' }} />
                        {p.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="hide-mobile" style={{ fontSize: 12, color: 'var(--sl-400)' }}>{fmtDate(p.created_at)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 3 }}>
                        <button
                          className="btn btn-ghost btn-icon btn-sm"
                          disabled={!editable}
                          title={editable ? 'Edit user' : 'You do not have permission to edit this user'}
                          style={!editable ? { opacity: 0.3 } : undefined}
                          onClick={() => editable && setEditModal(p)}>
                          {Icons.edit}
                        </button>
                        <button
                          className="btn btn-ghost btn-icon btn-sm"
                          disabled={!editable}
                          style={{ color: editable ? (p.active ? 'var(--red-500)' : 'var(--green-600)') : undefined, opacity: editable ? 1 : 0.3 }}
                          title={editable ? (p.active ? 'Deactivate user' : 'Activate user') : 'You do not have permission to deactivate this user'}
                          onClick={() => editable && toggle(p)}>
                          {p.active ? Icons.trash : Icons.check}
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {addModal && (
        <AddUserModal actorRole={user.role} onClose={() => setAddModal(false)} onSaved={load} />
      )}
      {editModal && (
        <EditUserModal
          profile={editModal}
          actorRole={user.role}
          onClose={() => setEditModal(null)}
          onSaved={load}
        />
      )}
      {confirm && <Confirm msg={confirm.msg} onYes={confirm.onYes} onNo={() => setConfirm(null)} />}
    </div>
  )
}
