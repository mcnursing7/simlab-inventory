import React, { useEffect } from 'react'

const S = (d) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">{d}</svg>
export const Icons = {
  flask:    S(<><path d="M9 3h6M9 3v8L3 20h18L15 11V3"/></>),
  home:     S(<><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></>),
  list:     S(<><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></>),
  boxes:    S(<><path d="M12 2 2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></>),
  location: S(<><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></>),
  truck:    S(<><path d="M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v3"/><rect x="9" y="11" width="14" height="10" rx="2"/><circle cx="12" cy="21" r="1"/><circle cx="20" cy="21" r="1"/></>),
  receipt:  S(<><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><line x1="8" y1="7" x2="16" y2="7"/><line x1="8" y1="11" x2="16" y2="11"/><line x1="8" y1="15" x2="12" y2="15"/></>),
  download: S(<><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7,10 12,15 17,10"/><line x1="12" y1="15" x2="12" y2="3"/></>),
  arrows:   S(<><path d="m16 3 4 4-4 4"/><path d="M20 7H4"/><path d="m8 21-4-4 4-4"/><path d="M4 17h16"/></>),
  sliders:  S(<><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></>),
  chart:    S(<><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></>),
  users:    S(<><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>),
  plus:     S(<><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>),
  edit:     S(<><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></>),
  trash:    S(<><polyline points="3,6 5,6 21,6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></>),
  eye:      S(<><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>),
  x:        S(<><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>),
  check:    S(<polyline points="20,6 9,17 4,12"/>),
  alert:    S(<><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></>),
  info:     S(<><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></>),
  logout:   S(<><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16,17 21,12 16,7"/><line x1="21" y1="12" x2="9" y2="12"/></>),
  barcode:  S(<><path d="M3 5v1M3 10v4M3 19v-1M21 5v1M21 10v4M21 19v-1M7 5v14M10 5v14M13 5v3M13 11v3M13 18v1M16 5v14M19 5v3M19 11v3M19 18v1"/></>),
  qr:       S(<><rect x="3" y="3" width="5" height="5"/><rect x="16" y="3" width="5" height="5"/><rect x="3" y="16" width="5" height="5"/><path d="M21 16h-3a2 2 0 0 0-2 2v3"/><line x1="21" y1="21" x2="21" y2="21"/><path d="M3 10h4"/><path d="M14 8v3"/><path d="M11 10h3"/><path d="M14 14h4v3"/><path d="M17 17h1v4"/></>),
  print:    S(<><polyline points="6,9 6,2 18,2 18,9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></>),
  dollar:   S(<><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></>),
  package:  S(<><path d="m16.5 9.4-9-5.19M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27,6.96 12,12.01 20.73,6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></>),
  menu:     S(<><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></>),
  refresh:  S(<><polyline points="23,4 23,10 17,10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></>),
  star:     S(<polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>),
  mail:     S(<><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></>),
  phone:    S(<><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.62 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></>),
}

export const fmt$ = (n) => new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(+n||0)
export const fmtDate = (d) => { if(!d) return '—'; return new Date(d+'T12:00').toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) }
export const initials = (n='') => n.split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase()
export const today = () => new Date().toISOString().split('T')[0]
export const uid = () => Math.random().toString(36).slice(2,10)
export const ROLES = {admin:'Admin',manager:'Manager',lab_staff:'Lab Staff'}
export const ROLE_CLS = {admin:'badge-red',manager:'badge-violet',lab_staff:'badge-blue'}
export const CATS = ['PPE','Consumables','Reagents','Chemicals','Equipment','Glassware','Supplies','Other']
export const ADJ_CATS = ['Usage','Discrepancy Correction','Damaged','Expired','Returned','Other']
export const PO_STATUS_CLS = {draft:'badge-slate',open:'badge-blue',partial:'badge-amber',received:'badge-green',cancelled:'badge-red'}

export function Modal({title,onClose,children,footer,size=''}) {
  useEffect(() => {
    const h = e => { if(e.key==='Escape') onClose() }
    document.addEventListener('keydown',h)
    return () => document.removeEventListener('keydown',h)
  },[onClose])
  return (
    <div className="modal-backdrop" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className={`modal ${size}`}>
        <div className="modal-header">
          <div className="modal-title">{title}</div>
          <button className="modal-close" onClick={onClose}>{Icons.x}</button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  )
}

export function Confirm({msg,onYes,onNo}) {
  return (
    <div className="modal-backdrop" style={{zIndex:2000}} onClick={e=>e.target===e.currentTarget&&onNo()}>
      <div className="modal" style={{maxWidth:360}}>
        <div className="modal-body" style={{paddingTop:26}}>
          <div style={{display:'flex',gap:13,alignItems:'flex-start'}}>
            <div style={{width:38,height:38,borderRadius:'50%',background:'var(--red-100)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,color:'var(--red-600)'}}>{Icons.alert}</div>
            <div><div style={{fontWeight:700,fontSize:14,marginBottom:5}}>Confirm</div><div style={{fontSize:13,color:'var(--sl-500)',lineHeight:1.6}}>{msg}</div></div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onNo}>Cancel</button>
          <button className="btn btn-danger" onClick={onYes} style={{background:'var(--red-600)',color:'#fff',borderColor:'var(--red-600)'}}>Confirm</button>
        </div>
      </div>
    </div>
  )
}

export function Field({label,note,children}) {
  return <div className="ff"><label className="fl">{label}{note&&<span className="fn">{note}</span>}</label>{children}</div>
}
export function Inp({value,onChange,type='text',placeholder,required,min,max,step,disabled,style,onKeyDown}) {
  return <input className="fi" type={type} value={value??''} onChange={onChange} placeholder={placeholder} required={required} min={min} max={max} step={step} disabled={disabled} style={style} onKeyDown={onKeyDown}/>
}
export function Sel({value,onChange,children,required}) {
  return <select className="fi" value={value??''} onChange={onChange} required={required}>{children}</select>
}
export function Txt({value,onChange,placeholder,rows=3}) {
  return <textarea className="fi" value={value??''} onChange={onChange} placeholder={placeholder} rows={rows}/>
}
export function Empty({icon,title,sub}) {
  return <div className="empty">{icon}<p>{title}</p>{sub&&<span style={{fontSize:12}}>{sub}</span>}</div>
}
export function Spinner() { return <div className="loading-page"><div className="spin"/><span>Loading…</span></div> }
