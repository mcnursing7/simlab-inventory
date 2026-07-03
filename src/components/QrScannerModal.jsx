import React, { useEffect, useRef, useState } from 'react'
import { Icons, Modal } from './UI'

function hasBarcodeDetector() {
  return typeof window !== 'undefined' && 'BarcodeDetector' in window
}

export default function QrScannerModal({ onScan, onClose }) {
  const videoRef  = useRef(null)
  const streamRef = useRef(null)
  const rafRef    = useRef(null)
  const [error, setError]     = useState(null)
  const [manual, setManual]   = useState('')
  const [noApi, setNoApi]     = useState(false)

  useEffect(() => {
    if (!hasBarcodeDetector()) { setNoApi(true); return }
    startCamera()
    return () => stopCamera()
  }, [])

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
        detect()
      }
    } catch (e) {
      if (e.name === 'NotAllowedError') setError('Camera access denied. Allow camera access in browser settings, or use manual entry below.')
      else if (e.name === 'NotFoundError') setError('No camera found on this device.')
      else setError('Could not start camera: ' + e.message)
    }
  }

  const stopCamera = () => {
    cancelAnimationFrame(rafRef.current)
    streamRef.current?.getTracks().forEach(t => t.stop())
  }

  const detect = async () => {
    if (!videoRef.current || videoRef.current.readyState < 2) {
      rafRef.current = requestAnimationFrame(detect); return
    }
    try {
      const detector = new BarcodeDetector({ formats: ['qr_code','code_128','code_39','ean_13','ean_8','data_matrix'] })
      const barcodes = await detector.detect(videoRef.current)
      if (barcodes.length > 0) { stopCamera(); onScan(barcodes[0].rawValue); onClose(); return }
    } catch (e) {}
    rafRef.current = requestAnimationFrame(detect)
  }

  const submitManual = e => {
    e.preventDefault()
    if (manual.trim()) { onScan(manual.trim()); onClose() }
  }

  return (
    <Modal title="Scan Item" onClose={() => { stopCamera(); onClose() }}
      footer={<button className="btn btn-secondary" onClick={() => { stopCamera(); onClose() }}>Cancel</button>}>
      {!noApi && !error && (
        <div style={{ position:'relative', borderRadius:10, overflow:'hidden', background:'#000', marginBottom:16 }}>
          <video ref={videoRef} style={{ width:'100%', display:'block', maxHeight:280, objectFit:'cover' }} playsInline muted />
          <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', pointerEvents:'none' }}>
            <div style={{ width:200, height:200, border:'2px solid rgba(255,255,255,.7)', borderRadius:12, boxShadow:'0 0 0 9999px rgba(0,0,0,.35)' }}/>
          </div>
          <div style={{ position:'absolute', bottom:10, left:0, right:0, textAlign:'center', color:'rgba(255,255,255,.8)', fontSize:12 }}>
            Point camera at barcode or QR code
          </div>
        </div>
      )}
      {error && <div className="alert alert-warning">{Icons.alert}<span>{error}</span></div>}
      {noApi && <div className="alert alert-info">{Icons.info}<span>Camera scanning not supported in this browser. Use a keyboard barcode reader or type the code below.</span></div>}
      <form onSubmit={submitManual}>
        <div style={{ fontSize:12, fontWeight:600, color:'var(--sl-500)', marginBottom:6 }}>
          {noApi || error ? 'Enter code manually' : 'Or enter code manually'}
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <input className="fi" value={manual} onChange={e => setManual(e.target.value)}
            placeholder="Type or scan SKU / QR value…" autoFocus={noApi || !!error} style={{ flex:1 }}/>
          <button type="submit" className="btn btn-primary">Use</button>
        </div>
      </form>
    </Modal>
  )
}