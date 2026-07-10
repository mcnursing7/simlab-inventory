import React, { useEffect, useRef, useState } from 'react'
import JsBarcode from 'jsbarcode'
import QRCode from 'qrcode'
import jsPDF from 'jspdf'
import toast from 'react-hot-toast'
import { Icons, Modal, fmt$ } from './UI'
import { AVERY_TEMPLATES, DEFAULT_TEMPLATE } from '../lib/labels'

// ── One label's visual design (used both on-screen and for print) ──
// Barcode and QR both encode the item's SKU (not JSON) so either one
// scans cleanly with the same handleScan() logic used elsewhere in
// the app — OnHand's scanner does a plain string match on item.sku.
function LabelCell({ item, template }) {
  const barRef = useRef()
  const qrRef  = useRef()

  useEffect(() => {
    if (qrRef.current) {
      QRCode.toCanvas(qrRef.current, item.sku, {
        width: 160, margin: 0, color: { dark: '#000', light: '#ffffff' },
      }).catch(() => {})
    }
    if (barRef.current) {
      try {
        JsBarcode(barRef.current, item.sku, {
          format: 'CODE128', displayValue: false,
          height: 40, margin: 0, background: '#fff', lineColor: '#000',
        })
      } catch (e) {
        // SKU has characters CODE128 can't encode — leave the barcode blank
        // rather than crash the whole sheet.
      }
    }
  }, [item.id, item.sku])

  return (
    <div className="label-cell" style={{ width: `${template.labelW}in`, height: `${template.labelH}in` }}>
      <div className="label-cell-inner">
        <div className="label-top">
          <canvas ref={qrRef} className="label-qr" />
          <div className="label-text">
            <div className="label-name">{item.name}</div>
            <div className="label-sku">SKU: {item.sku}</div>
            <div className="label-price">{fmt$(item.price)}</div>
          </div>
        </div>
        <canvas ref={barRef} className="label-barcode" />
      </div>
    </div>
  )
}

function LabelPage({ items, template }) {
  return (
    <div className="label-page" style={{
      width: '8.5in', height: '11in', background: '#fff',
      paddingTop: `${template.marginTop}in`, paddingLeft: `${template.marginLeft}in`,
      display: 'grid',
      gridTemplateColumns: `repeat(${template.cols}, ${template.labelW}in)`,
      gridAutoRows: `${template.labelH}in`,
      columnGap: `${template.colGap}in`, rowGap: `${template.rowGap}in`,
    }}>
      {items.map((item, i) => <LabelCell key={item.id + '-' + i} item={item} template={template} />)}
    </div>
  )
}

// Injected once — dashed slot outlines on screen for alignment reference,
// hidden in the actual print output; @media print isolates #label-print-area
// so nothing else in the app ends up on the page.
function PrintStyles() {
  return (
    <style>{`
      .label-cell { box-sizing: border-box; padding: 0.08in; overflow: hidden; border: 1px dashed #cbd5e1; page-break-inside: avoid; }
      .label-cell-inner { display: flex; flex-direction: column; height: 100%; justify-content: space-between; }
      .label-top { display: flex; gap: 0.08in; align-items: flex-start; flex: 1; min-height: 0; }
      .label-qr { width: 0.9in; height: 0.9in; flex-shrink: 0; }
      .label-text { min-width: 0; overflow: hidden; }
      .label-name { font-weight: 700; font-size: 11px; line-height: 1.25; color: #0c4a6e;
        display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
      .label-sku { font-size: 10px; color: #64748b; margin-top: 3px; font-family: monospace; }
      .label-price { font-size: 12px; font-weight: 700; color: #0c4a6e; margin-top: 3px; }
      .label-barcode { width: 100%; height: 0.4in; }
      .label-page + .label-page { page-break-before: always; margin-top: 16px; }

      @media print {
        .label-cell { border: none; }
        .label-page + .label-page { margin-top: 0; }
        body * { visibility: hidden; }
        #label-print-area, #label-print-area * { visibility: visible; }
        #label-print-area { position: absolute; left: 0; top: 0; }
        @page { size: letter; margin: 0; }
      }
    `}</style>
  )
}

// ── Build a downloadable PDF matching the same template/geometry ───
async function buildPdf(items, templateKey) {
  const t = AVERY_TEMPLATES[templateKey]
  const doc = new jsPDF({ unit: 'in', format: 'letter' })
  const perPage = t.cols * t.rows

  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    const posOnPage = i % perPage
    if (i > 0 && posOnPage === 0) doc.addPage()
    const col = posOnPage % t.cols
    const row = Math.floor(posOnPage / t.cols)
    const x = t.marginLeft + col * (t.labelW + t.colGap)
    const y = t.marginTop + row * (t.labelH + t.rowGap)

    // Render off-screen (detached canvases) purely to get data URLs for jsPDF
    const qrCanvas = document.createElement('canvas')
    await QRCode.toCanvas(qrCanvas, item.sku, { width: 240, margin: 0 })

    let hasBarcode = true
    const barCanvas = document.createElement('canvas')
    try {
      JsBarcode(barCanvas, item.sku, { format: 'CODE128', displayValue: false, height: 60, margin: 0 })
    } catch (e) { hasBarcode = false }

    const pad = 0.08
    const qrSize = Math.min(t.labelH - pad * 2 - 0.45, 0.9)
    doc.addImage(qrCanvas.toDataURL('image/png'), 'PNG', x + pad, y + pad, qrSize, qrSize)

    const textX = x + pad + qrSize + pad
    const textW = t.labelW - (textX - x) - pad
    doc.setFont(undefined, 'bold')
    doc.setFontSize(10)
    doc.text(doc.splitTextToSize(item.name, textW), textX, y + pad + 0.13)
    doc.setFont(undefined, 'normal')
    doc.setFontSize(8)
    doc.text(`SKU: ${item.sku}`, textX, y + pad + 0.4)
    doc.setFont(undefined, 'bold')
    doc.setFontSize(9)
    doc.text(fmt$(item.price), textX, y + pad + 0.56)

    if (hasBarcode) {
      const barH = Math.min(0.4, t.labelH * 0.22)
      doc.addImage(barCanvas.toDataURL('image/png'), 'PNG', x + pad, y + t.labelH - barH - pad, t.labelW - pad * 2, barH)
    }
  }
  return doc
}

// ── Template picker + Print + Download PDF buttons ─────────────────
export function LabelControls({ templateKey, setTemplateKey, items, disabled }) {
  const [exporting, setExporting] = useState(false)

  const handlePrint = () => {
    if (items.length === 0) { toast.error('No items selected'); return }
    window.print()
  }

  const handleDownload = async () => {
    if (items.length === 0) { toast.error('No items selected'); return }
    setExporting(true)
    try {
      const doc = await buildPdf(items, templateKey)
      doc.save(`labels-${new Date().toISOString().slice(0, 10)}.pdf`)
    } catch (e) {
      toast.error('Failed to build PDF: ' + e.message)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
      <select className="fi" style={{ width: 260 }} value={templateKey} onChange={e => setTemplateKey(e.target.value)}>
        {Object.entries(AVERY_TEMPLATES).map(([k, t]) => <option key={k} value={k}>{t.name}</option>)}
      </select>
      <button className="btn btn-secondary" onClick={handlePrint} disabled={disabled}>{Icons.print} Print</button>
      <button className="btn btn-primary" onClick={handleDownload} disabled={disabled || exporting}>
        {exporting ? <div className="spin" /> : Icons.download} Download PDF
      </button>
    </div>
  )
}

// ── Paginated on-screen preview (also the actual print source) ─────
export function LabelSheetPreview({ items, templateKey }) {
  const template = AVERY_TEMPLATES[templateKey]
  const perPage = template.cols * template.rows
  const pages = []
  for (let i = 0; i < items.length; i += perPage) pages.push(items.slice(i, i + perPage))

  if (items.length === 0) {
    return <div className="empty">{Icons.barcode}<p>Select items to preview labels</p></div>
  }

  return (
    <>
      <PrintStyles />
      <div id="label-print-area">
        {pages.map((pageItems, i) => <LabelPage key={i} items={pageItems} template={template} />)}
      </div>
    </>
  )
}

// ── Quick single-item modal — used from OnHand rows/detail and MasterList ─
export default function LabelPrintModal({ item, onClose }) {
  const [templateKey, setTemplateKey] = useState(DEFAULT_TEMPLATE)
  return (
    <Modal title={`Print Label: ${item.name}`} onClose={onClose}
      footer={<button className="btn btn-secondary" onClick={onClose}>Close</button>}>
      <div style={{ marginBottom: 12 }}>
        <LabelControls templateKey={templateKey} setTemplateKey={setTemplateKey} items={[item]} />
      </div>
      <div style={{ overflow: 'auto', maxHeight: 420, background: '#e2e8f0', borderRadius: 8, padding: 16 }}>
        <LabelSheetPreview items={[item]} templateKey={templateKey} />
      </div>
    </Modal>
  )
}
