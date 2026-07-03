import React, { useState } from 'react'
import QrScannerModal from './QrScannerModal'

// Reusable camera scan button — drop it next to any input
// onScan(value) is called with the scanned/entered value
export default function ScanButton({ onScan, style }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" className="btn btn-secondary" title="Scan with camera (QR or barcode)"
        onClick={() => setOpen(true)} style={{ flexShrink:0, ...style }}>
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
          <circle cx="12" cy="13" r="4"/>
        </svg>
      </button>
      {open && <QrScannerModal onScan={onScan} onClose={() => setOpen(false)} />}
    </>
  )
}