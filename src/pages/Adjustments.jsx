import React, { useState, useMemo } from 'react'
import { useData } from '../hooks/useData'
import { createAdjustment } from '../lib/db'
import { useAuth } from '../hooks/useAuth'
import { Icons, Modal, Field, Inp, Sel, Txt, fmtDate, ADJ_CATS } from '../components/UI'
import ScanButton from '../components/ScanButton'
import toast from 'react-hot-toast'

// Build full display path for a location: "Main Storage › Shelf 1"
function locationPath(loc, allLocs) {
  if (!loc.parent_id) return loc.name
  const parent = allLocs.find(l => l.id === loc.parent_id)
  return parent ? `${parent.name} › ${loc.name}` : loc.name
}

// Given an item and all inventory rows, return the locations that
// actually have stock of that item — these are the only valid choices.
// If a parent location has no stock but its children do, the parent
// won't appear (inventory lives at the sublocation level).
function locationsWithStock(itemId, inventory, allLocs) {
  const rows = inventory.filter(r => r.item_id === itemId && r.qty > 0)
  return rows
    .map(r => {
      const loc = allLocs.find(l => l.id === r.location_id)
      return loc ? { ...loc, qty: r.qty, path: locationPath(loc, allLocs) } : null
    })
    .filter(Boolean)
    .sort((a, b) => a.path.localeCompare(b.path))
}

// When no item is selected yet, show all active locations but
// visually group them so user understands the structure.
// Parents that have children are shown greyed/disabled as headers.
function allLocationsGrouped(allLocs) {
  const active  = allLocs.filter(l => l.active)
  const parents = active.filter(l => !l.parent_id)
  const result  = []
  for (const p of parents) {
    const children = active.filter(l => l.parent_id === p.id)
    if (children.length > 0) {
      // Parent has sublocations — show as disabled group header
      result.push({ ...p, isGroupHeader: true, path: p.name })
      children.forEach(c => result.push({ ...c, isGroupHeader: false, path: `${p.name} › ${c.name}` }))
    } else {
      // No sublocations — show the parent itself as selectable
      result.push({ ...p, isGroupHeader: false, path: p.name })
    }
  }
  return result
}

export default function Adjustments() {
  const { items, locations, inventory, transactions, reload } = useData()
  const { user } = useAuth()
  const [modal, setModal]   = useState(false)
  const [saving, setSaving] = useState(false)
  const EF = { itemId: '', locationId: '', dir: 'minus', qty: '', adjCategory: 'Usage', note: '' }
  const [form, setForm] = useState(EF)
  const f = k => e => setForm(p => ({ ...p, [k]: e.target.value }))

  const txs = [...transactions]
    .filter(t => t.type === 'adjustment')
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

  const AdjCls = {
    'Usage': 'badge-amber', 'Discrepancy Correction': 'badge-violet',
    'Damaged': 'badge-red', 'Expired': 'badge-red',
    'Returned': 'badge-green', 'Other': 'badge-slate'
  }

  // Locations available for the selected item
  const stockedLocations = useMemo(() => {
    if (!form.itemId) return allLocationsGrouped(locations)
    return locationsWithStock(form.itemId, inventory, locations)
  }, [form.itemId, inventory, locations])

  // Current qty at the selected location
  const curQty = useMemo(() => {
    if (!form.itemId || !form.locationId) return null
    return inventory.find(r => r.item_id === form.itemId && r.location_id === form.locationId)?.qty || 0
  }, [form.itemId, form.locationId, inventory])

  // When item changes, reset location (old location may not have this item's stock)
  const handleItemChange = e => {
    setForm(p => ({ ...p, itemId: e.target.value, locationId: '' }))
  }

  const handleScan = scanned => {
    let sku = scanned
    try { const p = JSON.parse(scanned); sku = p.sku || scanned } catch {}
    const found = items.find(i => i.sku === sku)
    if (found) { setForm(p => ({ ...p, itemId: found.id, locationId: '' })); setModal(true) }
    else toast.error(`No item found for "${sku}"`)
  }

  const save = async e => {
    e.preventDefault(); setSaving(true)
    try {
      const qty = form.dir === 'minus' ? -Math.abs(+form.qty) : Math.abs(+form.qty)
      await createAdjustment({
        itemId: form.itemId, locationId: form.locationId,
        qty, adjCategory: form.adjCategory, note: form.note, userId: user.id
      })
      await reload(); setModal(false); setForm(EF)
      toast.success('Adjustment recorded')
    } catch (e) { toast.error(e.message) } finally { setSaving(false) }
  }

  const selectedItem = items.find(i => i.id === form.itemId)

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <button className="btn btn-primary" onClick={() => { setForm(EF); setModal(true) }}>
          {Icons.plus} New Adjustment
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
              <th className="hide-mobile">Location</th>
              <th>Category</th><th>Qty</th>
              <th className="hide-mobile">Note</th>
            </tr></thead>
            <tbody>
              {txs.map(t => {
                const it  = items.find(i => i.id === t.item_id)
                const loc = locations.find(l => l.id === t.location_id)
                return (
                  <tr key={t.id}>
                    <td>{fmtDate(t.date)}</td>
                    <td style={{ fontWeight: 600 }}>{it?.name}</td>
                    <td className="hide-mobile"><span className="sku-chip">{it?.sku}</span></td>
                    <td className="hide-mobile">
                      <span className="loc-chip">{locationPath(loc || {}, locations)}</span>
                    </td>
                    <td><span className={`badge ${AdjCls[t.adj_category] || 'badge-slate'}`}>{t.adj_category}</span></td>
                    <td style={{ fontWeight: 700, color: t.qty >= 0 ? 'var(--green-600)' : 'var(--red-600)' }}>
                      {t.qty >= 0 ? '+' : ''}{t.qty}
                    </td>
                    <td className="hide-mobile" style={{ fontSize: 12, color: 'var(--sl-500)' }}>{t.note}</td>
                  </tr>
                )
              })}
              {txs.length === 0 && (
                <tr><td colSpan={7}>
                  <div className="empty">{Icons.sliders}<p>No adjustments yet</p></div>
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <Modal title="Record Inventory Adjustment" onClose={() => setModal(false)}
          footer={
            <><button className="btn btn-secondary" onClick={() => setModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={() => document.getElementById('aform').requestSubmit()} disabled={saving}>
                {saving ? <div className="spin" /> : Icons.check} Save
              </button></>
          }>
          <form id="aform" onSubmit={save}>

            {/* Item selector + scan button */}
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
                  if (found) setForm(p => ({ ...p, itemId: found.id, locationId: '' }))
                  else toast.error('Item not found')
                }} />
              </div>
            </div>

            {/* Location selector — smart filtered */}
            <Field label="Location *">
              {!form.itemId ? (
                // No item selected — show all locations, parents as disabled headers
                <select className="fi" value={form.locationId} onChange={f('locationId')} required>
                  <option value="">Select item first to filter locations…</option>
                  {allLocationsGrouped(locations.filter(l => l.active)).map(loc => (
                    <option
                      key={loc.id}
                      value={loc.isGroupHeader ? '' : loc.id}
                      disabled={loc.isGroupHeader}
                      style={loc.isGroupHeader ? { color: 'var(--sl-300)', fontStyle: 'italic' } : {}}>
                      {loc.isGroupHeader ? `— ${loc.path} —` : loc.path}
                    </option>
                  ))}
                </select>
              ) : stockedLocations.length === 0 ? (
                // Item selected but no stock anywhere
                <div>
                  <select className="fi" disabled>
                    <option>No stock found for this item</option>
                  </select>
                  <div style={{ fontSize: 12, color: 'var(--amber-700)', marginTop: 5 }}>
                    This item has no stock at any location. Use direction "Add (+)" to receive stock first.
                  </div>
                </div>
              ) : (
                // Item selected — show only locations with actual stock
                <select className="fi" value={form.locationId} onChange={f('locationId')} required>
                  <option value="">
                    {stockedLocations.length === 1
                      ? 'Select location…'
                      : `Select location (${stockedLocations.length} with stock)…`}
                  </option>
                  {stockedLocations.map(loc => (
                    <option key={loc.id} value={loc.id}>
                      {loc.path}{loc.qty !== undefined ? ` — ${loc.qty} on hand` : ''}
                    </option>
                  ))}
                </select>
              )}
            </Field>

            {/* If adding stock and no location available, allow any location */}
            {form.itemId && stockedLocations.length === 0 && (
              <Field label="Add stock to location">
                <select className="fi" value={form.locationId} onChange={f('locationId')} required>
                  <option value="">Select destination location…</option>
                  {allLocationsGrouped(locations.filter(l => l.active)).map(loc => (
                    <option key={loc.id} value={loc.isGroupHeader ? '' : loc.id} disabled={loc.isGroupHeader}
                      style={loc.isGroupHeader ? { color: 'var(--sl-300)', fontStyle: 'italic' } : {}}>
                      {loc.isGroupHeader ? `— ${loc.path} —` : loc.path}
                    </option>
                  ))}
                </select>
              </Field>
            )}

            {/* Current stock info */}
            {curQty !== null && (
              <div style={{ padding: '9px 12px', background: 'var(--sky-50)', borderRadius: 8, fontSize: 13, color: 'var(--sky-800)', border: '1px solid var(--sky-200)', marginBottom: 12 }}>
                Current on hand at this location: <strong>{curQty} {selectedItem?.unit}</strong>
              </div>
            )}

            <Field label="Category *">
              <Sel value={form.adjCategory} onChange={f('adjCategory')}>
                {ADJ_CATS.map(c => <option key={c} value={c}>{c}</option>)}
              </Sel>
            </Field>

            <div className="fr2">
              <Field label="Direction">
                <Sel value={form.dir} onChange={f('dir')}>
                  <option value="minus">Remove (−) from stock</option>
                  <option value="plus">Add (+) to stock</option>
                </Sel>
              </Field>
              <Field label="Quantity *">
                <Inp type="number" min="1" value={form.qty} onChange={f('qty')} required />
              </Field>
            </div>

            <Field label="Reason / Note *" note="required for audit trail">
              <Txt value={form.note} onChange={f('note')} placeholder="Describe reason for this adjustment…" rows={3} />
            </Field>

          </form>
        </Modal>
      )}
    </div>
  )
}
