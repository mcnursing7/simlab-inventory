import React, { useState, useMemo } from 'react'
import { useData } from '../hooks/useData'
import { createTransfer } from '../lib/db'
import { useAuth } from '../hooks/useAuth'
import { Icons, Modal, Field, Inp, Sel, fmtDate } from '../components/UI'
import ScanButton from '../components/ScanButton'
import toast from 'react-hot-toast'

// Build full display path: "Main Storage › Shelf 1"
function locationPath(loc, allLocs) {
  if (!loc) return '—'
  if (!loc.parent_id) return loc.name
  const parent = allLocs.find(l => l.id === loc.parent_id)
  return parent ? `${parent.name} › ${loc.name}` : loc.name
}

// Locations where a specific item actually has stock
function locationsWithStock(itemId, inventory, allLocs) {
  return inventory
    .filter(r => r.item_id === itemId && r.qty > 0)
    .map(r => {
      const loc = allLocs.find(l => l.id === r.location_id)
      return loc ? { ...loc, qty: r.qty, path: locationPath(loc, allLocs) } : null
    })
    .filter(Boolean)
    .sort((a, b) => a.path.localeCompare(b.path))
}

// All active locations grouped (parents as disabled headers if they have children)
function allLocationsGrouped(allLocs) {
  const active  = allLocs.filter(l => l.active)
  const parents = active.filter(l => !l.parent_id)
  const result  = []
  for (const p of parents) {
    const children = active.filter(l => l.parent_id === p.id)
    if (children.length > 0) {
      result.push({ ...p, isGroupHeader: true, path: p.name })
      children.forEach(c => result.push({ ...c, isGroupHeader: false, path: `${p.name} › ${c.name}` }))
    } else {
      result.push({ ...p, isGroupHeader: false, path: p.name })
    }
  }
  return result
}

export default function Transfers() {
  const { items, locations, inventory, transactions, reload } = useData()
  const { user } = useAuth()
  const [modal, setModal]   = useState(false)
  const [saving, setSaving] = useState(false)
  const EF = { itemId: '', fromLocationId: '', toLocationId: '', qty: '', note: '' }
  const [form, setForm] = useState(EF)
  const f = k => e => setForm(p => ({ ...p, [k]: e.target.value }))

  const txs = [...transactions]
    .filter(t => t.type === 'transfer')
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

  // FROM: only locations where the selected item has stock
  const fromLocations = useMemo(() => {
    if (!form.itemId) return []
    return locationsWithStock(form.itemId, inventory, locations)
  }, [form.itemId, inventory, locations])

  // TO: all active locations except the selected from-location
  const toLocations = useMemo(() => {
    return allLocationsGrouped(locations.filter(l => l.active && l.id !== form.fromLocationId))
  }, [locations, form.fromLocationId])

  // Available qty at selected from-location
  const availQty = useMemo(() => {
    if (!form.itemId || !form.fromLocationId) return null
    return inventory.find(r => r.item_id === form.itemId && r.location_id === form.fromLocationId)?.qty || 0
  }, [form.itemId, form.fromLocationId, inventory])

  const handleItemChange = e => {
    setForm(p => ({ ...p, itemId: e.target.value, fromLocationId: '', toLocationId: '' }))
  }

  const handleFromChange = e => {
    setForm(p => ({ ...p, fromLocationId: e.target.value, toLocationId: '' }))
  }

  const handleScan = scanned => {
    let sku = scanned
    try { const p = JSON.parse(scanned); sku = p.sku || scanned } catch {}
    const found = items.find(i => i.sku === sku)
    if (found) { setForm(p => ({ ...p, itemId: found.id, fromLocationId: '', toLocationId: '' })); setModal(true) }
    else toast.error(`No item found for "${sku}"`)
  }

  const save = async e => {
    e.preventDefault(); setSaving(true)
    try {
      if (form.fromLocationId === form.toLocationId) {
        toast.error('From and To locations must be different'); setSaving(false); return
      }
      await createTransfer({
        itemId: form.itemId,
        fromLocationId: form.fromLocationId,
        toLocationId: form.toLocationId,
        qty: +form.qty,
        note: form.note,
        userId: user.id
      })
      await reload(); setModal(false); setForm(EF)
      toast.success('Transfer recorded')
    } catch (e) { toast.error(e.message) } finally { setSaving(false) }
  }

  const selectedItem = items.find(i => i.id === form.itemId)

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <button className="btn btn-primary" onClick={() => { setForm(EF); setModal(true) }}>
          {Icons.plus} New Transfer
        </button>
        <ScanButton onScan={handleScan} />
        <span style={{ fontSize: 12, color: 'var(--sl-400)', alignSelf: 'center' }}>
          Scan item to start
        </span>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table className="dt">
            <thead><tr>
              <th>Date</th><th>Item</th>
              <th className="hide-mobile">SKU</th>
              <th>From</th><th>To</th><th>Qty</th>
              <th className="hide-mobile">Note</th>
            </tr></thead>
            <tbody>
              {txs.map(t => {
                const it   = items.find(i => i.id === t.item_id)
                const from = locations.find(l => l.id === t.location_id)
                const to   = locations.find(l => l.id === t.to_location_id)
                return (
                  <tr key={t.id}>
                    <td>{fmtDate(t.date)}</td>
                    <td style={{ fontWeight: 600 }}>{it?.name}</td>
                    <td className="hide-mobile"><span className="sku-chip">{it?.sku}</span></td>
                    <td><span className="loc-chip">{locationPath(from, locations)}</span></td>
                    <td><span className="badge badge-green">{locationPath(to, locations)}</span></td>
                    <td style={{ fontWeight: 700 }}>{t.qty}</td>
                    <td className="hide-mobile" style={{ fontSize: 12, color: 'var(--sl-500)' }}>{t.note}</td>
                  </tr>
                )
              })}
              {txs.length === 0 && (
                <tr><td colSpan={7}>
                  <div className="empty">{Icons.arrows}<p>No transfers yet</p></div>
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <Modal title="Transfer Between Locations" onClose={() => setModal(false)}
          footer={
            <><button className="btn btn-secondary" onClick={() => setModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={() => document.getElementById('tform').requestSubmit()} disabled={saving}>
                {saving ? <div className="spin" /> : Icons.check} Transfer
              </button></>
          }>
          <form id="tform" onSubmit={save}>

            {/* Item selector + scan */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 13 }}>
              <div style={{ flex: 1 }}>
                <label className="fl">Item *</label>
                <select className="fi" value={form.itemId} onChange={handleItemChange} required>
                  <option value="">Select item…</option>
                  {items.map(i => <option key={i.id} value={i.id}>{i.name} ({i.sku})</option>)}
                </select>
              </div>
              <div style={{ alignSelf: 'flex-end', paddingBottom: 1 }}>
                <ScanButton onScan={scanned => {
                  let sku = scanned
                  try { const p = JSON.parse(scanned); sku = p.sku || scanned } catch {}
                  const found = items.find(i => i.sku === sku)
                  if (found) setForm(p => ({ ...p, itemId: found.id, fromLocationId: '', toLocationId: '' }))
                  else toast.error('Item not found')
                }} />
              </div>
            </div>

            {/* FROM location — only where item has stock */}
            <Field label="From Location *"
              note={form.itemId && fromLocations.length === 0 ? 'No stock found for this item' : undefined}>
              {!form.itemId ? (
                <select className="fi" disabled>
                  <option>Select an item first…</option>
                </select>
              ) : fromLocations.length === 0 ? (
                <select className="fi" disabled>
                  <option>No stock found for this item at any location</option>
                </select>
              ) : (
                <select className="fi" value={form.fromLocationId} onChange={handleFromChange} required>
                  <option value="">
                    {fromLocations.length === 1
                      ? 'Select source location…'
                      : `Select source (${fromLocations.length} locations with stock)…`}
                  </option>
                  {fromLocations.map(loc => (
                    <option key={loc.id} value={loc.id}>
                      {loc.path} — {loc.qty} {selectedItem?.unit} on hand
                    </option>
                  ))}
                </select>
              )}
            </Field>

            {/* Available qty at from-location */}
            {availQty !== null && (
              <div style={{ padding: '9px 12px', background: 'var(--sky-50)', borderRadius: 8, fontSize: 13, color: 'var(--sky-800)', border: '1px solid var(--sky-200)', marginBottom: 12 }}>
                Available to transfer: <strong>{availQty} {selectedItem?.unit}</strong>
              </div>
            )}

            {/* TO location — all locations except the from-location */}
            <Field label="To Location *">
              <select className="fi" value={form.toLocationId} onChange={f('toLocationId')} required
                disabled={!form.fromLocationId}>
                <option value="">
                  {!form.fromLocationId ? 'Select From location first…' : 'Select destination…'}
                </option>
                {toLocations.map(loc => (
                  <option
                    key={loc.id}
                    value={loc.isGroupHeader ? '' : loc.id}
                    disabled={loc.isGroupHeader}
                    style={loc.isGroupHeader ? { color: 'var(--sl-300)', fontStyle: 'italic' } : {}}>
                    {loc.isGroupHeader ? `— ${loc.path} —` : loc.path}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Quantity *">
              <Inp
                type="number"
                min="1"
                max={availQty || undefined}
                value={form.qty}
                onChange={f('qty')}
                required
              />
            </Field>

            <Field label="Note">
              <Inp value={form.note} onChange={f('note')} placeholder="Reason or description…" />
            </Field>

          </form>
        </Modal>
      )}
    </div>
  )
}
