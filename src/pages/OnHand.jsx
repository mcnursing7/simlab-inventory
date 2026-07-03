import React, { useState, useMemo } from 'react'
import { useData, totalOnHand } from '../hooks/useData'
import { Icons, Modal, fmt$, fmtDate } from '../components/UI'
import ScanButton from '../components/ScanButton'

function DetailModal({ item, data, onClose }) {
  const [tab, setTab] = useState('locations')
  const { inventory, transactions, pos, locations, vendors } = data
  const rows = inventory.filter(r => r.item_id === item.id)
  const txs = [...transactions]
    .filter(t => t.item_id === item.id)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  const itemPos = pos.filter(po => po.lines && po.lines.some(l => l.item_id === item.id))
  const total = rows.reduce((s, r) => s + r.qty, 0)
  const low = total <= item.min_qty
  const PO_CLS = { draft: 'badge-slate', open: 'badge-blue', partial: 'badge-amber', received: 'badge-green', cancelled: 'badge-red' }

  return (
    <Modal title={item.name} onClose={onClose} size="modal-xl"
      footer={<button className="btn btn-secondary" onClick={onClose}>Close</button>}>

      {/* Summary row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 18 }}>
        {[
          { l: 'Total On Hand', v: `${total} ${item.unit}`, c: low ? 'var(--red-600)' : undefined },
          { l: 'Total Value',   v: fmt$(total * item.price) },
          { l: 'Unit Price',    v: fmt$(item.price) },
          { l: 'Min / Max',     v: `${item.min_qty} / ${item.max_qty}` },
        ].map((s, i) => (
          <div key={i} style={{ background: 'var(--sky-50)', borderRadius: 8, padding: '10px 13px', border: '1px solid var(--sky-100)' }}>
            <div style={{ fontSize: 10, color: 'var(--sl-400)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.4px' }}>{s.l}</div>
            <div style={{ fontSize: 17, fontWeight: 700, color: s.c || 'var(--sky-900)', marginTop: 3 }}>{s.v}</div>
          </div>
        ))}
      </div>

      <div className="tab-bar">
        {['locations', 'transactions', 'purchase orders'].map(t => (
          <div key={t} className={`tab${tab === t ? ' active' : ''}`} onClick={() => setTab(t)} style={{ textTransform: 'capitalize' }}>{t}</div>
        ))}
      </div>

      {/* Locations tab */}
      {tab === 'locations' && (
        <table className="dt">
          <thead><tr><th>Location</th><th>Qty On Hand</th><th>Value</th></tr></thead>
          <tbody>
            {rows.filter(r => r.qty > 0).map(r => {
              const loc = locations.find(l => l.id === r.location_id)
              return (
                <tr key={r.id}>
                  <td>
                    <span className="loc-chip">{Icons.location}{loc?.name || '—'}</span>
                    {loc?.is_main && <span className="badge badge-blue" style={{ marginLeft: 5 }}>Main</span>}
                  </td>
                  <td style={{ fontWeight: 700 }}>{r.qty} {item.unit}</td>
                  <td>{fmt$(r.qty * item.price)}</td>
                </tr>
              )
            })}
            {rows.filter(r => r.qty > 0).length === 0 && (
              <tr><td colSpan={3}><div className="empty">{Icons.boxes}<p>No stock at any location</p></div></td></tr>
            )}
          </tbody>
        </table>
      )}

      {/* Transactions tab */}
      {tab === 'transactions' && (
        <table className="dt">
          <thead><tr><th>Date</th><th>Type</th><th>Qty</th><th>Location</th><th>Detail</th></tr></thead>
          <tbody>
            {txs.map(t => {
              const loc   = locations.find(l => l.id === t.location_id)
              const toLoc = t.to_location_id ? locations.find(l => l.id === t.to_location_id) : null
              return (
                <tr key={t.id}>
                  <td>{fmtDate(t.date)}</td>
                  <td><span className={`badge ${t.type === 'receiving' ? 'badge-green' : t.type === 'adjustment' ? 'badge-amber' : 'badge-blue'}`}>{t.type}</span></td>
                  <td style={{ fontWeight: 700, color: t.qty >= 0 ? 'var(--green-600)' : 'var(--red-600)' }}>{t.qty >= 0 ? '+' : ''}{t.qty}</td>
                  <td><span className="loc-chip">{loc?.name}{toLoc && <> → {toLoc.name}</>}</span></td>
                  <td style={{ fontSize: 12, color: 'var(--sl-500)' }}>
                    {t.adj_category && <span className="badge badge-amber" style={{ marginRight: 4 }}>{t.adj_category}</span>}
                    {t.note}
                  </td>
                </tr>
              )
            })}
            {txs.length === 0 && (
              <tr><td colSpan={5}><div className="empty">{Icons.list}<p>No transactions</p></div></td></tr>
            )}
          </tbody>
        </table>
      )}

      {/* Purchase orders tab */}
      {tab === 'purchase orders' && (
        <table className="dt">
          <thead><tr><th>PO #</th><th>Vendor</th><th>Date</th><th>Status</th><th>Ordered</th><th>Received</th></tr></thead>
          <tbody>
            {itemPos.map(po => {
              const v    = vendors.find(x => x.id === po.vendor_id)
              const line = po.lines.find(l => l.item_id === item.id)
              return (
                <tr key={po.id}>
                  <td><span className="sku-chip">{po.number}</span></td>
                  <td>{v?.name}</td>
                  <td>{fmtDate(po.date)}</td>
                  <td><span className={`badge ${PO_CLS[po.status] || 'badge-slate'}`}>{po.status}</span></td>
                  <td>{line?.qty} {item.unit}</td>
                  <td style={{ fontWeight: 700 }}>{line?.received || 0}/{line?.qty}</td>
                </tr>
              )
            })}
            {itemPos.length === 0 && (
              <tr><td colSpan={6}><div className="empty">{Icons.receipt}<p>No purchase orders</p></div></td></tr>
            )}
          </tbody>
        </table>
      )}
    </Modal>
  )
}

export default function OnHand() {
  const data = useData()
  const { items, inventory } = data
  const [search, setSearch] = useState('')
  const [detail, setDetail] = useState(null)
  const [scanMsg, setScanMsg] = useState(null)

  const filtered = useMemo(() =>
    items.filter(i =>
      search === '' ||
      i.name.toLowerCase().includes(search.toLowerCase()) ||
      i.sku.toLowerCase().includes(search.toLowerCase())
    ), [items, search])

  const handleScan = (code) => {
    const value = code.trim().toLowerCase()
    const match = items.find(i =>
      i.sku.toLowerCase() === value || String(i.id).toLowerCase() === value
    )
    if (match) {
      setScanMsg(null)
      setDetail(match)
    } else {
      // No exact match — fall back to filtering the table with the scanned value
      setSearch(code.trim())
      setScanMsg(`No item found for "${code.trim()}" — showing closest matches.`)
    }
  }

  return (
    <div>
      <div style={{ marginBottom: 14, display: 'flex', gap: 8, alignItems: 'center' }}>
        <div className="search-wrap" style={{ flex: 1 }}>
          {Icons.barcode}
          <input className="search-input" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search inventory…" style={{ paddingLeft: 32 }} />
        </div>
        <ScanButton onScan={handleScan} />
      </div>

      {scanMsg && (
        <div className="alert alert-warning" style={{ marginBottom: 14 }}>
          {Icons.alert}<span>{scanMsg}</span>
        </div>
      )}

      <div className="card">
        <div className="table-wrap">
          <table className="dt">
            <thead><tr>
              <th>SKU</th><th>Item</th><th>On Hand</th>
              <th className="hide-mobile">Locations</th>
              <th>Price</th><th>Value</th>
              <th className="hide-mobile">Level</th>
              <th></th>
            </tr></thead>
            <tbody>
              {filtered.map(item => {
                const rows  = inventory.filter(r => r.item_id === item.id && r.qty > 0)
                const total = rows.reduce((s, r) => s + r.qty, 0)
                const low   = total <= item.min_qty
                const pct   = Math.min(100, (total / item.max_qty) * 100)
                return (
                  <tr key={item.id}>
                    <td><span className="sku-chip">{item.sku}</span></td>
                    <td style={{ fontWeight: 600 }}>{item.name}</td>
                    <td>
                      <span style={{ fontSize: 16, fontWeight: 700, color: low ? 'var(--red-600)' : 'var(--sl-800)' }}>{total}</span>
                      <span style={{ fontSize: 11, color: 'var(--sl-400)', marginLeft: 4 }}>{item.unit}</span>
                    </td>
                    <td className="hide-mobile">
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {rows.map(r => {
                          const loc = data.locations.find(l => l.id === r.location_id)
                          return <span key={r.id} className="loc-chip">{loc?.name}: {r.qty}</span>
                        })}
                        {rows.length === 0 && <span style={{ color: 'var(--sl-300)', fontSize: 12 }}>No stock</span>}
                      </div>
                    </td>
                    <td>{fmt$(item.price)}</td>
                    <td style={{ fontWeight: 700 }}>{fmt$(total * item.price)}</td>
                    <td className="hide-mobile" style={{ minWidth: 100 }}>
                      <div className="prog-bar">
                        <div className="prog-fill" style={{ width: pct + '%', background: low ? 'var(--red-400)' : pct > 75 ? 'var(--green-600)' : 'var(--amber-400)' }} />
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--sl-400)', marginTop: 2 }}>{total}/{item.max_qty}</div>
                    </td>
                    <td><button className="btn btn-ghost btn-sm" onClick={() => setDetail(item)}>{Icons.eye}View</button></td>
                  </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={8}><div className="empty">{Icons.boxes}<p>No items found</p></div></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {detail && <DetailModal item={detail} data={data} onClose={() => setDetail(null)} />}
    </div>
  )
}
