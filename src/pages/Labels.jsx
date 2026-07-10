import React, { useState, useMemo } from 'react'
import { useData } from '../hooks/useData'
import { Icons, CATS } from '../components/UI'
import { LabelControls, LabelSheetPreview } from '../components/LabelPrinter'
import { DEFAULT_TEMPLATE } from '../lib/labels'

export default function Labels() {
  const { items } = useData()
  const [search, setSearch]     = useState('')
  const [catF, setCatF]         = useState('')
  const [selected, setSelected] = useState(new Set())
  const [templateKey, setTemplateKey] = useState(DEFAULT_TEMPLATE)

  const filtered = useMemo(() => items.filter(i =>
    (search === '' ||
      i.name.toLowerCase().includes(search.toLowerCase()) ||
      i.sku.toLowerCase().includes(search.toLowerCase())) &&
    (catF === '' || i.category === catF)
  ), [items, search, catF])

  const toggle = id => setSelected(prev => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })

  const allFilteredSelected = filtered.length > 0 && filtered.every(i => selected.has(i.id))
  const toggleAllFiltered = () => setSelected(prev => {
    const next = new Set(prev)
    filtered.forEach(i => allFilteredSelected ? next.delete(i.id) : next.add(i.id))
    return next
  })

  const selectedItems = items.filter(i => selected.has(i.id))

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 16, alignItems: 'start' }}>
      {/* Item picker */}
      <div className="card" style={{ padding: 12 }}>
        <div className="search-wrap" style={{ marginBottom: 10 }}>
          {Icons.barcode}
          <input className="search-input" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search items…" style={{ paddingLeft: 32, width: '100%' }} />
        </div>

        <select className="fi" style={{ width: '100%', marginBottom: 10 }} value={catF} onChange={e => setCatF(e.target.value)}>
          <option value="">All categories</option>
          {CATS.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        <button className="btn btn-secondary btn-sm" style={{ width: '100%', marginBottom: 8, justifyContent: 'center' }}
          onClick={toggleAllFiltered} disabled={filtered.length === 0}>
          {allFilteredSelected ? 'Deselect' : 'Select'} all filtered ({filtered.length})
        </button>

        <div style={{ maxHeight: 460, overflow: 'auto', border: '1px solid var(--sky-100)', borderRadius: 8 }}>
          {filtered.map(item => (
            <label key={item.id} style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px',
              borderBottom: '1px solid var(--sky-50)', cursor: 'pointer', fontSize: 13,
            }}>
              <input type="checkbox" checked={selected.has(item.id)} onChange={() => toggle(item.id)} />
              <span className="sku-chip" style={{ fontSize: 10 }}>{item.sku}</span>
              <span style={{ flex: 1, fontWeight: 600 }}>{item.name}</span>
            </label>
          ))}
          {filtered.length === 0 && (
            <div style={{ padding: 16, textAlign: 'center', color: 'var(--sl-400)', fontSize: 13 }}>No items match</div>
          )}
        </div>

        <div style={{ marginTop: 10, fontSize: 12, color: 'var(--sl-500)' }}>
          {selected.size} item{selected.size !== 1 ? 's' : ''} selected
        </div>
      </div>

      {/* Preview + print/export controls */}
      <div className="card" style={{ padding: 16 }}>
        <div style={{ marginBottom: 12 }}>
          <LabelControls
            templateKey={templateKey}
            setTemplateKey={setTemplateKey}
            items={selectedItems}
            disabled={selectedItems.length === 0}
          />
        </div>
        <div style={{ overflow: 'auto', maxHeight: 640, background: '#e2e8f0', borderRadius: 8, padding: 16 }}>
          <LabelSheetPreview items={selectedItems} templateKey={templateKey} />
        </div>
      </div>
    </div>
  )
}
