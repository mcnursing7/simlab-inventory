import React,{useState,useMemo} from 'react'
import {useData,totalOnHand,getLowItems} from '../hooks/useData'
import {Icons,fmt$,fmtDate,today} from '../components/UI'

export default function Reports(){
  const {items,inventory,transactions,locations,pos,vendors}=useData()
  const [tab,setTab]=useState('onhand')
  const [from,setFrom]=useState(new Date().getFullYear()+'-01-01')
  const [to,setTo]=useState(today())
  const [locF,setLocF]=useState('')

  const filtTx=useMemo(()=>transactions.filter(t=>t.date>=from&&t.date<=to&&(!locF||t.location_id===locF)),[transactions,from,to,locF])
  const onhandRows=useMemo(()=>items.filter(i=>i.active).map(it=>{const qty=totalOnHand(inventory,it.id);return{...it,qty,value:qty*it.price,low:qty<=it.min_qty}}),[items,inventory])
  const grand=onhandRows.reduce((s,r)=>s+r.value,0)
  const recTx=filtTx.filter(t=>t.type==='receiving')
  const adjTx=filtTx.filter(t=>t.type==='adjustment')
  const useTx=filtTx.filter(t=>t.type==='adjustment'&&t.adj_category==='Usage')
  const lowItems=getLowItems(items,inventory)

  const print=()=>{
    const el=document.getElementById('rpt')
    if(!el) return
    const w=window.open('','_blank')
    w.document.write(`<!DOCTYPE html><html><head><title>SimLab Report</title><style>*{box-sizing:border-box}body{font-family:system-ui;font-size:12px;padding:24px;color:#1e293b}h2{font-size:17px;color:#0c4a6e;margin-bottom:4px}.sub{color:#94a3b8;font-size:12px;margin-bottom:16px}table{width:100%;border-collapse:collapse}th{text-align:left;padding:7px 10px;font-size:10px;text-transform:uppercase;letter-spacing:.5px;background:#f0f9ff;border-bottom:1px solid #bae6fd;color:#64748b}td{padding:7px 10px;border-bottom:1px solid #f1f5f9;font-size:12px}.tr td{font-weight:700;border-top:2px solid #0ea5e9;background:#f0f9ff}</style></head><body>${el.innerHTML}<script>setTimeout(()=>window.print(),300)<\/script></body></html>`)
    w.document.close()
  }

  const TABS=[{id:'onhand',l:'On Hand'},{id:'receiving',l:'Receiving'},{id:'adjustments',l:'Adjustments'},{id:'usage',l:'Usage'},{id:'low',l:'Low Stock'}]
  const needsRange=tab==='receiving'||tab==='adjustments'||tab==='usage'

  return(
    <div>
      <div className="tab-bar">{TABS.map(t=><div key={t.id} className={`tab${tab===t.id?' active':''}`} onClick={()=>setTab(t.id)}>{t.l}</div>)}</div>
      <div style={{display:'flex',gap:10,marginBottom:14,flexWrap:'wrap',alignItems:'flex-end'}}>
        {needsRange&&<>
          <div className="ff" style={{margin:0}}><label className="fl">From</label><input className="fi" type="date" value={from} onChange={e=>setFrom(e.target.value)} style={{width:150}}/></div>
          <div className="ff" style={{margin:0}}><label className="fl">To</label><input className="fi" type="date" value={to} onChange={e=>setTo(e.target.value)} style={{width:150}}/></div>
          <div className="ff" style={{margin:0}}><label className="fl">Location</label><select className="fi" value={locF} onChange={e=>setLocF(e.target.value)} style={{width:170}}><option value="">All Locations</option>{locations.filter(l=>l.active).map(l=><option key={l.id} value={l.id}>{l.name}</option>)}</select></div>
        </>}
        <button className="btn btn-secondary" onClick={print}>{Icons.print}Print Report</button>
      </div>

      <div id="rpt">
        {tab==='onhand'&&<>
          <h2>Inventory On Hand Report</h2><p className="sub">All locations · as of {fmtDate(today())}</p>
          <div className="card"><div className="tw"><table className="dt"><thead><tr><th>SKU</th><th>Item</th><th>Category</th><th>On Hand</th><th>Unit</th><th>Price</th><th>Value</th><th>Status</th></tr></thead><tbody>
            {onhandRows.map(r=><tr key={r.id}><td><span className="sku-chip">{r.sku}</span></td><td style={{fontWeight:600}}>{r.name}</td><td><span className="badge badge-blue">{r.category}</span></td>
            <td style={{fontWeight:700,color:r.low?'var(--red-600)':'inherit'}}>{r.qty}</td><td>{r.unit}</td><td>{fmt$(r.price)}</td><td style={{fontWeight:700}}>{fmt$(r.value)}</td>
            <td><span className={`badge ${r.low?'badge-red':'badge-green'}`}>{r.low?'Low':'OK'}</span></td></tr>)}
            <tr className="total-row"><td colSpan={6} style={{fontSize:14}}>Grand Total</td><td colSpan={2} style={{fontSize:15}}>{fmt$(grand)}</td></tr>
          </tbody></table></div></div>
        </>}

        {tab==='receiving'&&<>
          <h2>Receiving Report</h2><p className="sub">{fmtDate(from)} — {fmtDate(to)}</p>
          <div className="card"><div className="tw"><table className="dt"><thead><tr><th>Date</th><th>PO #</th><th>Item</th><th>Location</th><th>Qty</th><th>Value</th></tr></thead><tbody>
            {recTx.map(t=>{const it=items.find(i=>i.id===t.item_id);const loc=locations.find(l=>l.id===t.location_id);const po=pos.find(p=>p.id===t.ref_id);const line=po?.lines?.find(l=>l.item_id===t.item_id)
              return<tr key={t.id}><td>{fmtDate(t.date)}</td><td>{po&&<span className="sku-chip">{po.number}</span>}</td><td style={{fontWeight:600}}>{it?.name}</td><td><span className="loc-chip">{loc?.name}</span></td><td style={{color:'var(--green-600)',fontWeight:700}}>+{t.qty}</td><td style={{fontWeight:700}}>{fmt$(t.qty*(line?.unit_price||it?.price||0))}</td></tr>
            })}{recTx.length===0&&<tr><td colSpan={6}><div className="empty">{Icons.download}<p>No receiving in this period</p></div></td></tr>}
          </tbody></table></div></div>
        </>}

        {tab==='adjustments'&&<>
          <h2>Adjustment Report</h2><p className="sub">{fmtDate(from)} — {fmtDate(to)}</p>
          <div className="card"><div className="tw"><table className="dt"><thead><tr><th>Date</th><th>Item</th><th>Location</th><th>Category</th><th>Qty</th><th>Note</th></tr></thead><tbody>
            {adjTx.map(t=>{const it=items.find(i=>i.id===t.item_id);const loc=locations.find(l=>l.id===t.location_id)
              return<tr key={t.id}><td>{fmtDate(t.date)}</td><td style={{fontWeight:600}}>{it?.name}</td><td><span className="loc-chip">{loc?.name}</span></td>
              <td><span className="badge badge-amber">{t.adj_category}</span></td>
              <td style={{fontWeight:700,color:t.qty>=0?'var(--green-600)':'var(--red-600)'}}>{t.qty>=0?'+':''}{t.qty}</td>
              <td style={{fontSize:12,color:'var(--sl-500)'}}>{t.note}</td></tr>
            })}{adjTx.length===0&&<tr><td colSpan={6}><div className="empty">{Icons.sliders}<p>No adjustments in this period</p></div></td></tr>}
          </tbody></table></div></div>
        </>}

        {tab==='usage'&&<>
          <h2>Item Usage Report</h2><p className="sub">{fmtDate(from)} — {fmtDate(to)}</p>
          <div className="card"><div className="tw"><table className="dt"><thead><tr><th>Date</th><th>Item</th><th>Location</th><th>Used</th><th>Unit</th><th>Cost</th><th>Note</th></tr></thead><tbody>
            {useTx.map(t=>{const it=items.find(i=>i.id===t.item_id);const loc=locations.find(l=>l.id===t.location_id)
              return<tr key={t.id}><td>{fmtDate(t.date)}</td><td style={{fontWeight:600}}>{it?.name}</td><td><span className="loc-chip">{loc?.name}</span></td>
              <td style={{fontWeight:700,color:'var(--red-600)'}}>{Math.abs(t.qty)}</td><td>{it?.unit}</td>
              <td style={{fontWeight:700}}>{fmt$(Math.abs(t.qty)*(it?.price||0))}</td>
              <td style={{fontSize:12,color:'var(--sl-500)'}}>{t.note}</td></tr>
            })}{useTx.length===0&&<tr><td colSpan={7}><div className="empty">{Icons.chart}<p>No usage in this period</p></div></td></tr>}
            {useTx.length>0&&<tr className="total-row"><td colSpan={5}>Total Usage Cost</td><td colSpan={2}>{fmt$(useTx.reduce((s,t)=>{const it=items.find(i=>i.id===t.item_id);return s+Math.abs(t.qty)*(it?.price||0)},0))}</td></tr>}
          </tbody></table></div></div>
        </>}

        {tab==='low'&&<>
          <h2>Low Inventory Report</h2><p className="sub">Items at or below minimum · as of {fmtDate(today())}</p>
          <div className="card"><div className="tw"><table className="dt"><thead><tr><th>SKU</th><th>Item</th><th>On Hand</th><th>Min</th><th>Max</th><th>Needed</th><th>Reorder Value</th></tr></thead><tbody>
            {lowItems.map(it=>{const qty=totalOnHand(inventory,it.id);const need=it.max_qty-qty
              return<tr key={it.id}><td><span className="sku-chip">{it.sku}</span></td><td style={{fontWeight:600}}>{it.name}</td>
              <td style={{fontWeight:700,color:'var(--red-600)'}}>{qty}</td><td>{it.min_qty}</td><td>{it.max_qty}</td>
              <td style={{fontWeight:700,color:'var(--amber-700)'}}>{need}</td><td style={{fontWeight:700}}>{fmt$(need*it.price)}</td></tr>
            })}{lowItems.length===0&&<tr><td colSpan={7}><div className="empty">{Icons.check}<p>All items adequately stocked!</p></div></td></tr>}
            {lowItems.length>0&&<tr className="total-row"><td colSpan={6}>Total Reorder Value</td><td>{fmt$(lowItems.reduce((s,it)=>{const qty=totalOnHand(inventory,it.id);return s+(it.max_qty-qty)*it.price},0))}</td></tr>}
          </tbody></table></div></div>
        </>}
      </div>
    </div>
  )
}
