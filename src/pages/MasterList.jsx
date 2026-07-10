import React, { useState, useMemo, useRef } from 'react'
import { useData, totalOnHand } from '../hooks/useData'
import { createItem, updateItem, deleteItem } from '../lib/db'
import { Icons, Modal, Confirm, Field, Inp, Sel, Txt, fmt$, CATS } from '../components/UI'
import ScanButton from '../components/ScanButton'
import LabelPrintModal from '../components/LabelPrinter'
import toast from 'react-hot-toast'

// ── SKU input with both keyboard scan and camera scan ────────────
// When a keyboard barcode reader fires it types the barcode and
// presses Enter very fast. We detect that and populate the field.
// The camera ScanButton gives a modal for QR / camera scanning.
function SkuField({ value, onChange, existingItems, onFound }) {
  const skuRef = useRef()

  // Keyboard scanner: fires Enter after typing the barcode
  const handleKeyDown = e => {
    if (e.key === 'Enter') {
      e.preventDefault()
      const v = e.target.value.trim()
      if (!v) return
      // If this SKU already exists, offer to load that item
      const found = existingItems.find(i => i.sku === v)
      if (found && onFound) {
        onFound(found)
        toast(`Loaded existing item: ${found.name}`, { icon: '📦' })
      }
      // Either way, keep the value in the field so the user can see it
    }
  }

  // Camera / QR scan result — labels now encode the raw SKU string
  // (JSON.parse will throw and fall through to using it as-is, so this
  // stays compatible with older printed labels that encoded JSON too)
  const handleScan = scanned => {
    let sku = scanned
    try { const p = JSON.parse(scanned); sku = p.sku || scanned } catch {}
    onChange(sku)
    // If the SKU matches an existing item, load it
    const found = existingItems.find(i => i.sku === sku)
    if (found && onFound) {
      onFound(found)
      toast(`Loaded existing item: ${found.name}`, { icon: '📦' })
    }
    // Focus back on the SKU field so the user can keep going
    setTimeout(() => skuRef.current?.focus(), 100)
  }

  return (
    <div style={{ display: 'flex', gap: 6 }}>
      <input
        ref={skuRef}
        className="fi"
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Type, scan keyboard reader, or use camera 📷"
        required
        style={{ flex: 1 }}
      />
      {/* Camera scan button — QR code or barcode via device camera */}
      <ScanButton onScan={handleScan} />
    </div>
  )
}

// ── Empty form defaults ──────────────────────────────────────────
const EF = { sku: '', name: '', category: '', unit: '', price: '', min_qty: '', max_qty: '', vendor_id: '', notes: '' }

// ── Main page ────────────────────────────────────────────────────
export default function MasterList() {
  const { items, vendors, inventory, reload } = useData()
  const [search, setSearch]   = useState('')
  const [catF, setCatF]       = useState('')
  const [modal, setModal]     = useState(null)   // null | 'add' | item object
  const [bcItem, setBcItem]   = useState(null)
  const [confirm, setConfirm] = useState(null)
  const [form, setForm]       = useState(EF)
  const [saving, setSaving]   = useState(false)

  const filtered = useMemo(() => items.filter(i =>
    (search === '' ||
      i.name.toLowerCase().includes(search.toLowerCase()) ||
      i.sku.toLowerCase().includes(search.toLowerCase()) ||
      i.category.toLowerCase().includes(search.toLowerCase())) &&
    (catF === '' || i.category === catF)
  ), [items, search, catF])

  // ── Search bar: keyboard scanner (Enter) + camera ──────────────
  const handleSearchScan = scanned => {
    let sku = scanned
    try { const p = JSON.parse(scanned); sku = p.sku || scanned } catch {}
    const found = items.find(i => i.sku === sku)
    if (found) {
      openEdit(found)
    } else {
      setSearch(scanned)
      toast(`No match for "${scanned}"`, { icon: '🔍' })
    }
  }

  const handleSearchKey = e => {
    if (e.key === 'Enter' && search.trim()) {
      const found = items.find(i => i.sku === search.trim())
      if (found) { openEdit(found); setSearch('') }
    }
  }

  // ── Open modals ────────────────────────────────────────────────
  const openAdd = () => { setForm(EF); setModal('add') }

  const openEdit = item => {
    setForm({
      ...item,
      price:     item.price + '',
      min_qty:   item.min_qty + '',
      max_qty:   item.max_qty + '',
      vendor_id: item.vendor_id || '',
    })
    setModal(item)
  }

  // ── When SKU field finds a matching existing item ──────────────
  // (only useful in Add mode — lets staff scan an existing label
  //  and flip to Edit mode automatically)
  const handleSkuFound = found => {
    if (modal === 'add') openEdit(found)
  }

  const f = k => e => setForm(p => ({ ...p, [k]: e.target.value }))

  const save = async e => {
    e.preventDefault(); setSaving(true)
    try {
      const body = {
        ...form,
        price:     +form.price,
        min_qty:   +form.min_qty,
        max_qty:   +form.max_qty,
        vendor_id: form.vendor_id || null,
      }
      if (modal === 'add') await createItem(body)
      else                 await updateItem(modal.id, body)
      await reload()
      setModal(null)
      toast.success(modal === 'add' ? 'Item added' : 'Item updated')
    } catch (e) { toast.error(e.message) } finally { setSaving(false) }
  }

  const del = item => setConfirm({
    msg: `Deactivate "${item.name}"?`,
    onYes: async () => { await deleteItem(item.id); await reload(); setConfirm(null); toast.success('Deactivated') }
  })

  return (
    <div>
      {/* ── Search bar with keyboard + camera scan ── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 8, flex: 1, minWidth: 200 }}>
          <div className="search-wrap" style={{ flex: 1 }}>
            {Icons.barcode}
            <input
              className="search-input"
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={handleSearchKey}
              placeholder="Search or scan to find item…"
              style={{ paddingLeft: 32 }}
            />
          </div>
          <ScanButton onScan={handleSearchScan} />
        </div>
        <select className="fi" style={{ width: 160 }} value={catF} onChange={e => setCatF(e.target.value)}>
          <option value="">All categories</option>
          {CATS.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <button className="btn btn-primary" onClick={openAdd}>{Icons.plus} Add Item</button>
      </div>

      {/* ── Table ── */}
      <div className="card">
        <div className="table-wrap">
          <table className="dt">
            <thead><tr>
              <th>SKU</th><th>Name</th><th>Category</th>
              <th className="hide-mobile">Unit</th>
              <th>Price</th>
              <th className="hide-mobile">Min/Max</th>
              <th>On Hand</th><th>Value</th><th></th>
            </tr></thead>
            <tbody>
              {filtered.map(item => {
                const qty = totalOnHand(inventory, item.id)
                const low = qty <= item.min_qty
                return (
                  <tr key={item.id}>
                    <td><span className="sku-chip">{item.sku}</span></td>
                    <td style={{ fontWeight: 600 }}>{item.name}</td>
                    <td><span className="badge badge-blue">{item.category}</span></td>
                    <td className="hide-mobile" style={{ color: 'var(--sl-500)' }}>{item.unit}</td>
                    <td style={{ fontWeight: 600 }}>{fmt$(item.price)}</td>
                    <td className="hide-mobile" style={{ fontSize: 12, fontFamily: 'var(--mono)', color: 'var(--sl-500)' }}>
                      {item.min_qty}/{item.max_qty}
                    </td>
                    <td>
                      <span style={{ fontWeight: 700, color: low ? 'var(--red-600)' : 'var(--sl-800)' }}>{qty}</span>
                      {low && <span className="badge badge-red" style={{ marginLeft: 5 }}>Low</span>}
                    </td>
                    <td style={{ fontWeight: 600 }}>{fmt$(qty * item.price)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 3 }}>
                        <button className="btn btn-ghost btn-icon btn-sm" title="Print label" onClick={() => setBcItem(item)}>{Icons.barcode}</button>
                        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openEdit(item)}>{Icons.edit}</button>
                        <button className="btn btn-ghost btn-icon btn-sm" style={{ color: 'var(--red-500)' }} onClick={() => del(item)}>{Icons.trash}</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={9}>
                  <div className="empty">{Icons.package}<p>No items found</p></div>
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Label modal ── */}
      {bcItem && <LabelPrintModal item={bcItem} onClose={() => setBcItem(null)} />}

      {/* ── Add / Edit modal ── */}
      {modal && (
        <Modal
          title={modal === 'add' ? 'Add New Item' : 'Edit Item'}
          onClose={() => setModal(null)}
          size="modal-lg"
          footer={
            <><button className="btn btn-secondary" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={() => document.getElementById('iform').requestSubmit()} disabled={saving}>
                {saving ? <div className="spin" /> : Icons.check}
                {modal === 'add' ? 'Add Item' : 'Save Changes'}
              </button></>
          }>
          <form id="iform" onSubmit={save}>

            <div className="fr2">
              {/* ── SKU field with keyboard + camera scan ── */}
              <Field label="SKU *" note="scan barcode/QR or type manually">
                <SkuField
                  value={form.sku}
                  onChange={v => setForm(p => ({ ...p, sku: v }))}
                  existingItems={items}
                  onFound={handleSkuFound}
                />
              </Field>

              <Field label="Category *">
                <Sel value={form.category} onChange={f('category')} required>
                  <option value="">Select…</option>
                  {CATS.map(c => <option key={c} value={c}>{c}</option>)}
                </Sel>
              </Field>
            </div>

            <Field label="Name *">
              <Inp value={form.name} onChange={f('name')} placeholder="e.g. Nitrile Gloves (Medium)" required />
            </Field>

            <div className="fr3">
              <Field label="Unit *">
                <Inp value={form.unit} onChange={f('unit')} placeholder="Box, Bottle, Pack…" required />
              </Field>
              <Field label="Price ($) *">
                <Inp type="number" step="0.01" min="0" value={form.price} onChange={f('price')} required />
              </Field>
              <Field label="Vendor">
                <Sel value={form.vendor_id || ''} onChange={f('vendor_id')}>
                  <option value="">None</option>
                  {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                </Sel>
              </Field>
            </div>

            <div className="fr2">
              <Field label="Min Qty *" note="triggers low stock alert">
                <Inp type="number" min="0" value={form.min_qty} onChange={f('min_qty')} required />
              </Field>
              <Field label="Max Qty *" note="reorder target">
                <Inp type="number" min="0" value={form.max_qty} onChange={f('max_qty')} required />
              </Field>
            </div>

            <Field label="Notes">
              <Txt value={form.notes || ''} onChange={f('notes')} rows={2} />
            </Field>

            {/* Hint for staff using a physical barcode scanner */}
            <div className="alert alert-info" style={{ marginBottom: 0 }}>
              {Icons.info}
              <span>
                <strong>Keyboard barcode reader:</strong> focus the SKU field, scan the label — it fills automatically and presses Enter.
                &nbsp;<strong>Camera (QR):</strong> tap the 📷 button next to SKU.
              </span>
            </div>

          </form>
        </Modal>
      )}

      {confirm && <Confirm msg={confirm.msg} onYes={confirm.onYes} onNo={() => setConfirm(null)} />}
    </div>
  )
}
