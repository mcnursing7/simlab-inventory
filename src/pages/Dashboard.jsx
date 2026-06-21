import React from 'react'
import { useData, getLowItems, totalOnHand } from '../hooks/useData'
import { Icons, fmt$, fmtDate } from '../components/UI'

export default function Dashboard({ setPage }) {
  const { items, inventory, pos, transactions, locations } = useData()
  const activeItems = items.filter(i=>i.active)
  const totalValue  = activeItems.reduce((s,it)=>s+totalOnHand(inventory,it.id)*it.price,0)
  const lowItems    = getLowItems(items,inventory)
  const openPOs     = pos.filter(p=>p.status==='open'||p.status==='partial')
  const recent      = [...transactions].sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)).slice(0,6)
  const txCls       = {receiving:'badge-green',adjustment:'badge-amber',transfer:'badge-blue'}
  const txIco       = {receiving:Icons.download,adjustment:Icons.sliders,transfer:Icons.arrows}

  return (
    <div>
      {lowItems.length>0 && (
        <div className="alert alert-warning" style={{marginBottom:18}}>
          {Icons.alert}
          <div>
            <strong>Low Stock Alert — {lowItems.length} item{lowItems.length>1?'s':''} need restocking</strong>
            <div style={{marginTop:8,display:'flex',flexWrap:'wrap',gap:6}}>
              {lowItems.map(it=>{
                const q=totalOnHand(inventory,it.id)
                return <span key={it.id} className="badge badge-amber" style={{cursor:'pointer'}} onClick={()=>setPage('onhand')}>{it.name} ({q}/{it.min_qty} min)</span>
              })}
            </div>
          </div>
        </div>
      )}
      <div className="stat-grid">
        {[
          {ico:Icons.package, label:'Active Items',    val:activeItems.length, sub:`${lowItems.length} low stock`,                              bg:'var(--sky-50)',   c:'var(--sky-600)'},
          {ico:Icons.dollar,  label:'Inventory Value', val:fmt$(totalValue),   sub:'at current prices',                                        bg:'var(--green-50)', c:'var(--green-700)'},
          {ico:Icons.receipt, label:'Open POs',        val:openPOs.length,     sub:`${pos.filter(p=>p.status==='received').length} fulfilled`,  bg:'var(--amber-50)', c:'var(--amber-700)'},
          {ico:Icons.alert,   label:'Low Stock',       val:lowItems.length,    sub:'at or below minimum',                                      bg:'var(--red-50)',   c:'var(--red-700)'},
        ].map((s,i)=>(
          <div className="stat-card" key={i}>
            <div className="stat-icon" style={{background:s.bg,color:s.c}}>{s.ico}</div>
            <div><div className="stat-value">{s.val}</div><div className="stat-label">{s.label}</div><div style={{fontSize:11,color:'var(--sl-400)',marginTop:2}}>{s.sub}</div></div>
          </div>
        ))}
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
        <div className="card">
          <div className="card-header"><div className="card-title">Recent Transactions</div></div>
          {recent.length===0 && <div className="empty">{Icons.list}<p>No transactions yet</p></div>}
          {recent.map(tx=>{
            const it  = items.find(i=>i.id===tx.item_id)
            const loc = locations.find(l=>l.id===tx.location_id)
            return (
              <div key={tx.id} style={{display:'flex',alignItems:'center',gap:11,padding:'9px 14px',borderBottom:'1px solid var(--sl-100)'}}>
                <div style={{width:30,height:30,borderRadius:'50%',background:'var(--sky-50)',border:'1px solid var(--sky-200)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,color:'var(--sky-600)'}}>{txIco[tx.type]}</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:600,fontSize:13,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{it?.name||'—'}</div>
                  <div style={{fontSize:11,color:'var(--sl-400)'}}>{loc?.name} · {fmtDate(tx.date)}</div>
                </div>
                <div style={{textAlign:'right',flexShrink:0}}>
                  <span className={`badge ${txCls[tx.type]||'badge-slate'}`}>{tx.type}</span>
                  <div style={{fontSize:12,fontWeight:700,color:tx.qty>=0?'var(--green-600)':'var(--red-600)',marginTop:2}}>{tx.qty>=0?'+':''}{tx.qty}</div>
                </div>
              </div>
            )
          })}
        </div>
        <div className="card">
          <div className="card-header"><div className="card-title">Low Stock Items</div><button className="btn btn-ghost btn-sm" onClick={()=>setPage('reports')}>View Report</button></div>
          {lowItems.length===0 && <div className="empty">{Icons.check}<p>All items adequately stocked</p><span>No items below minimum threshold</span></div>}
          {lowItems.map(it=>{
            const qty=totalOnHand(inventory,it.id)
            const pct=Math.min(100,(qty/it.max_qty)*100)
            return (
              <div key={it.id} style={{padding:'10px 14px',borderBottom:'1px solid var(--sl-100)'}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                  <span style={{fontWeight:600,fontSize:13}}>{it.name}</span>
                  <span style={{fontSize:12,fontWeight:700,color:'var(--red-600)'}}>{qty}/{it.min_qty} min</span>
                </div>
                <div className="prog-bar"><div className="prog-fill" style={{width:pct+'%',background:qty===0?'var(--sl-300)':'var(--red-400)'}}/></div>
                <div style={{fontSize:11,color:'var(--sl-400)',marginTop:3}}>Max: {it.max_qty} · {it.unit}</div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
