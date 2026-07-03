import React, { useState } from 'react'
import { useData } from '../hooks/useData'
import { createLocation, updateLocation, deleteLocation } from '../lib/db'
import { Icons, Modal, Confirm, Field, Inp, fmt$ } from '../components/UI'
import toast from 'react-hot-toast'

// Build display path: "Main Storage › Shelf 1"
function fullPath(loc, allLocs) {
  if (!loc.parent_id) return loc.name
  const parent = allLocs.find(l => l.id === loc.parent_id)
  return parent ? `${parent.name} › ${loc.name}` : loc.name
}

// Sort so parents appear first, children indented beneath them
function sortedLocations(locs) {
  const parents  = locs.filter(l => !l.parent_id)
  const children = locs.filter(l =>  l.parent_id)
  const result   = []
  for (const p of parents) {
    result.push(p)
    children.filter(c => c.parent_id === p.id).forEach(c => result.push(c))
  }
  // Any orphaned children (parent deleted) go at the end
  const placed = new Set(result.map(l => l.id))
  children.filter(c => !placed.has(c.id)).forEach(c => result.push(c))
  return result
}

export default function Locations({ user }) {
  const { locations, inventory, items, reload } = useData()
  const canEdit = user.role !== 'lab_staff'
  const [modal, setModal]     = useState(null)
  const [confirm, setConfirm] = useState(null)

  const EF = { name: '', code: '', is_main: false, notes: '', parent_id: '' }
  const [form, setForm] = useState(EF)
  const f = k => e => setForm(p => ({ ...p, [k]: e.target.value }))

  const active = locations.filter(l => l.active)
  const sorted = sortedLocations(active)

  // Only top-level locations can be parents (max 1 level deep)
  const parentOptions = active.filter(l => !l.parent_id)

  const openAdd = () => { setForm(EF); setModal('add') }
  const openEdit = loc => {
    setForm({
      name:      loc.name,
      code:      loc.code,
      is_main:   loc.is_main,
      notes:     loc.notes || '',
      parent_id: loc.parent_id || '',
    })
    setModal(loc)
  }

  const save = async e => {
    e.preventDefault()
    try {
      const payload = {
        name:      form.name,
        code:      form.code,
        notes:     form.notes,
        parent_id: form.parent_id || null,
        // Sublocations cannot be the main receiving location
        is_main:   form.parent_id ? false : form.is_main,
      }
      if (modal === 'add') await createLocation(payload)
      else                 await updateLocation(modal.id, payload)
      await reload()
      setModal(null)
      toast.success('Saved')
    } catch (e) { toast.error(e.message) }
  }

  const del = loc => {
    if (loc.is_main) { toast.error('Cannot delete the main receiving location'); return }
    const kids = active.filter(l => l.parent_id === loc.id)
    const warn = kids.length > 0 ? ` It has ${kids.length} sublocation(s) which will become top-level locations.` : ''
    setConfirm({
      msg: `Delete "${fullPath(loc, active)}"?${warn}`,
      onYes: async () => {
        await deleteLocation(loc.id)
        await reload()
        setConfirm(null)
        toast.success('Deleted')
      }
    })
  }

  return (
    <div>
      {canEdit && (
        <div style={{ marginBottom: 14 }}>
          <button className="btn btn-primary" onClick={openAdd}>{Icons.plus} Add Location</button>
        </div>
      )}

      <div className="card">
        <div className="table-wrap">
          <table className="dt">
            <thead><tr>
              <th>Location</th>
              <th>Code</th>
              <th>Type</th>
              <th className="hide-mobile">Stock</th>
              <th className="hide-mobile">Value</th>
              <th className="hide-mobile">Notes</th>
              <th></th>
            </tr></thead>
            <tbody>
              {sorted.map(loc => {
                const isSub  = !!loc.parent_id
                const parent = isSub ? active.find(l => l.id === loc.parent_id) : null
                const here   = inventory.filter(r => r.location_id === loc.id && r.qty > 0)
                const val    = here.reduce((s, r) => {
                  const it = items.find(i => i.id === r.item_id)
                  return s + (it ? r.qty * it.price : 0)
                }, 0)

                return (
                  <tr key={loc.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        {isSub && (
                          <span style={{ color: 'var(--sl-300)', fontSize: 15, flexShrink: 0, marginLeft: 8 }}>╰</span>
                        )}
                        <div>
                          <div style={{ fontWeight: isSub ? 500 : 700, color: isSub ? 'var(--sl-600)' : 'var(--sl-800)' }}>
                            {loc.name}
                          </div>
                          {isSub && parent && (
                            <div style={{ fontSize: 11, color: 'var(--sl-400)' }}>in {parent.name}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td><span className="sku-chip">{loc.code}</span></td>
                    <td>
                      {loc.is_main
                        ? <span className="badge badge-blue">Main</span>
                        : isSub
                          ? <span className="badge badge-slate">Sublocation</span>
                          : <span className="badge badge-slate">Location</span>}
                    </td>
                    <td className="hide-mobile" style={{ fontSize: 13, color: 'var(--sl-500)' }}>
                      {here.length} item type{here.length !== 1 ? 's' : ''}
                    </td>
                    <td className="hide-mobile" style={{ fontWeight: 600 }}>{fmt$(val)}</td>
                    <td className="hide-mobile" style={{ fontSize: 12, color: 'var(--sl-500)' }}>{loc.notes}</td>
                    <td>
                      {canEdit && (
                        <div style={{ display: 'flex', gap: 3 }}>
                          <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openEdit(loc)}>{Icons.edit}</button>
                          <button className="btn btn-ghost btn-icon btn-sm" style={{ color: 'var(--red-500)' }} onClick={() => del(loc)}>{Icons.trash}</button>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
              {sorted.length === 0 && (
                <tr><td colSpan={7}>
                  <div className="empty">{Icons.location}<p>No locations yet</p></div>
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit modal */}
      {modal && (
        <Modal
          title={modal === 'add' ? 'Add Location' : `Edit: ${modal.name}`}
          onClose={() => setModal(null)}
          footer={
            <><button className="btn btn-secondary" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={() => document.getElementById('loc-form').requestSubmit()}>
                {Icons.check} Save
              </button></>
          }>
          <form id="loc-form" onSubmit={save}>

            {/* Parent selector */}
            <Field label="Parent Location" note="leave blank for a top-level location">
              <select
                className="fi"
                value={form.parent_id}
                onChange={e => setForm(p => ({
                  ...p,
                  parent_id: e.target.value,
                  // Sublocations can't be the main location
                  is_main: e.target.value ? false : p.is_main,
                }))}>
                <option value="">None — top-level location</option>
                {parentOptions
                  // Can't set a location as its own parent
                  .filter(l => modal === 'add' || l.id !== modal.id)
                  .map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </Field>

            <div className="fr2">
              <Field label="Name *">
                <Inp
                  value={form.name}
                  onChange={f('name')}
                  placeholder={form.parent_id ? 'Shelf 1, Bay A, Fridge…' : 'Main Storage, Lab Room A…'}
                  required
                />
              </Field>
              <Field label="Code *" note="short unique ID">
                <Inp
                  value={form.code}
                  onChange={e => setForm(p => ({ ...p, code: e.target.value.toUpperCase() }))}
                  placeholder="SH1, LABA…"
                  required
                />
              </Field>
            </div>

            <Field label="Notes">
              <Inp value={form.notes} onChange={f('notes')} placeholder="Optional description…" />
            </Field>

            {/* Main receiving toggle — only for top-level locations */}
            {!form.parent_id && (
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '10px 0', borderTop: '1px solid var(--sl-100)', marginTop: 4 }}>
                <div className="toggle">
                  <input
                    type="checkbox"
                    checked={!!form.is_main}
                    onChange={e => setForm(p => ({ ...p, is_main: e.target.checked }))}
                  />
                  <div className="toggle-slider" />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>Main Receiving Location</div>
                  <div style={{ fontSize: 12, color: 'var(--sl-400)' }}>POs received here by default</div>
                </div>
              </label>
            )}

            {form.parent_id && (
              <div className="alert alert-info" style={{ marginTop: 8, marginBottom: 0 }}>
                {Icons.info}
                <span>Sublocations cannot be set as the main receiving location.</span>
              </div>
            )}
          </form>
        </Modal>
      )}

      {confirm && <Confirm msg={confirm.msg} onYes={confirm.onYes} onNo={() => setConfirm(null)} />}
    </div>
  )
}
