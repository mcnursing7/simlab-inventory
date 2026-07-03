import React,{useState,useMemo} from 'react'
import {useData} from '../hooks/useData'
import {createPO,cancelPO} from '../lib/db'
import {Icons,Modal,Confirm,Field,Inp,Sel,fmt$,fmtDate,uid,PO_STATUS_CLS} from '../components/UI'
import ScanButton from '../components/ScanButton'
import toast from 'react-hot-toast'

export default function PurchaseOrders({user}){
  const {vendors,locations,items,pos,reload}=useData()
  const canCreate=user.role!=='lab_staff'
  const mainLoc=locations.find(l=>l.is_main&&l.active)||locations[0]
  const [stF,setStF]=useState('')
  const [creating,setCreating]=useState(false)
  const [viewPO,setViewPO]=useState(null)
  const [confirm,setConfirm]=useState(null)
  const [saving,setSaving]=useState(false)
  const EF={vendorId:'',locationId:mainLoc?.id||'',notes:'',expectedDate:'',lines:[{id:uid(),itemId:'',qty:'',unitPrice:'',note:''}]}
  const [form,setForm]=useState(EF)

  const addLine=()=>setForm(p=>({...p,lines:[...p.lines,{id:uid(),itemId:'',qty:'',unitPrice:'',note:''}]}))
  const remLine=id=>setForm(p=>({...p,lines:p.lines.filter(l=>l.id!==id)}))
  const updLine=(id,k,v)=>setForm(p=>({...p,lines:p.lines.map(l=>l.id===id?{...l,[k]:v}:l)}))

  const save=async e=>{
    e.preventDefault();setSaving(true)
    try{await createPO({...form,createdBy:user.id},form.lines);await reload();setCreating(false);toast.success('PO created')}
    catch(e){toast.error(e.message)}finally{setSaving(false)}
  }

  const handleLineScan=(lineId,code)=>{
    const value=code.trim().toLowerCase()
    const match=items.find(i=>i.sku.toLowerCase()===value||String(i.id).toLowerCase()===value)
    if(match){
      updLine(lineId,'itemId',match.id)
      updLine(lineId,'unitPrice',match.price+'')
      toast.success(`Selected ${match.name}`)
    }else{
      toast.error(`No item found for "${code.trim()}"`)
    }
  }

  const filtered=useMemo(()=>pos.filter(p=>!stF||p.status===stF),[pos,stF])

  return(
    <div>
      <div style={{display:'flex',gap:10,marginBottom:14,alignItems:'center'}}>
        <select className="fi" style={{width:160}} value={stF} onChange={e=>setStF(e.target.value)}>
          <option value="">All statuses</option>
          {['open','partial','received','cancelled','draft'].map(s=><option key={s} value={s}>{s}</option>)}
        </select>
        {canCreate&&<button className="btn btn-primary" onClick={()=>{setForm({...EF,locationId:mainLoc?.id||''});setCreating(true)}}>{Icons.plus}Create PO</button>}
      </div>
      <div className="card"><div className="tw"><table className="dt"><thead><tr>
        <th>PO #</th><th>Vendor</th><th>Date</th><th className="hide-mobile">Location</th><th className="hide-mobile">Total</th><th>Status</th><th></th>
      </tr></thead><tbody>
        {filtered.map(po=>{
          const v=vendors.find(x=>x.id===po.vendor_id)
          const loc=locations.find(l=>l.id===po.location_id)
          const total=(po.lines||[]).reduce((s,l)=>s+l.qty*l.unit_price,0)
          return(
            <tr key={po.id}>
              <td><span className="sku-chip">{po.number}</span></td>
              <td style={{fontWeight:600}}>{v?.name||'—'}</td>
              <td>{fmtDate(po.date)}</td>
              <td className="hide-mobile"><span className="loc-chip">{loc?.name}</span></td>
              <td className="hide-mobile" style={{fontWeight:700}}>{fmt$(total)}</td>
              <td><span className={`badge ${PO_STATUS_CLS[po.status]||'badge-slate'}`}>{po.status}</span></td>
              <td><button className="btn btn-ghost btn-sm" onClick={()=>setViewPO(po)}>{Icons.eye}View</button></td>
            </tr>
          )
        })}
        {filtered.length===0&&<tr><td colSpan={7}><div className="empty">{Icons.receipt}<p>No purchase orders</p></div></td></tr>}
      </tbody></table></div></div>

      {viewPO&&(()=>{
        const v=vendors.find(x=>x.id===viewPO.vendor_id)
        const loc=locations.find(l=>l.id===viewPO.location_id)
        const total=(viewPO.lines||[]).reduce((s,l)=>s+l.qty*l.unit_price,0)
        return(
          <Modal title={viewPO.number} onClose={()=>setViewPO(null)} size="modal-xl"
            footer={<><button className="btn btn-secondary" onClick={()=>setViewPO(null)}>Close</button>
            {canCreate&&viewPO.status!=='cancelled'&&viewPO.status!=='received'&&
              <button className="btn btn-danger" onClick={()=>setConfirm({msg:`Cancel PO ${viewPO.number}?`,onYes:async()=>{await cancelPO(viewPO.id);await reload();setViewPO(null);setConfirm(null)}})}>Cancel PO</button>}</>}>
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:16}}>
              {[{l:'Vendor',v:v?.name},{l:'Location',v:loc?.name},{l:'Status',v:<span className={`badge ${PO_STATUS_CLS[viewPO.status]}`}>{viewPO.status}</span>}].map((s,i)=>(
                <div key={i} style={{background:'var(--sky-50)',borderRadius:8,padding:'10px 13px',border:'1px solid var(--sky-100)'}}>
                  <div style={{fontSize:10,color:'var(--sl-400)',fontWeight:700,marginBottom:3}}>{s.l}</div>
                  <div style={{fontWeight:600}}>{s.v}</div>
                </div>
              ))}
            </div>
            {viewPO.notes&&<div className="alert alert-info">{Icons.info}<span>{viewPO.notes}</span></div>}
            <table className="dt"><thead><tr><th>Item</th><th>Ordered</th><th>Price</th><th>Subtotal</th><th>Received</th></tr></thead><tbody>
              {(viewPO.lines||[]).map(l=>{
                const it=items.find(i=>i.id===l.item_id)
                const pct=l.qty>0?(l.received/l.qty)*100:0
                return(<tr key={l.id}><td style={{fontWeight:600}}>{it?.name}<div style={{fontSize:11,fontFamily:'var(--mono)',color:'var(--sl-400)'}}>{it?.sku}</div></td>
                <td>{l.qty} {it?.unit}</td><td>{fmt$(l.unit_price)}</td><td style={{fontWeight:700}}>{fmt$(l.qty*l.unit_price)}</td>
                <td><div style={{display:'flex',alignItems:'center',gap:8}}>{l.received}/{l.qty}
                  <div style={{flex:1,height:4,background:'var(--sl-100)',borderRadius:99,overflow:'hidden',minWidth:60}}>
                    <div style={{height:'100%',width:pct+'%',background:pct===100?'var(--green-600)':'var(--amber-400)',borderRadius:99}}/>
                  </div></div></td></tr>)
              })}
            </tbody></table>
            <div style={{textAlign:'right',padding:'12px 0',fontWeight:700,fontSize:15,color:'var(--sky-900)'}}>Total: {fmt$(total)}</div>
          </Modal>
        )
      })()}

      {creating&&(
        <Modal title="Create Purchase Order" onClose={()=>setCreating(false)} size="modal-xl"
          footer={<><button className="btn btn-secondary" onClick={()=>setCreating(false)}>Cancel</button><button className="btn btn-primary" onClick={()=>document.getElementById('poform').requestSubmit()} disabled={saving}>{saving?<div className="spin"/>:Icons.check}Create PO</button></>}>
          <form id="poform" onSubmit={save}>
            <div className="fr3">
              <Field label="Vendor *"><Sel value={form.vendorId} onChange={e=>setForm(p=>({...p,vendorId:e.target.value}))} required><option value="">Select…</option>{vendors.filter(v=>v.active).map(v=><option key={v.id} value={v.id}>{v.name}</option>)}</Sel></Field>
              <Field label="Receiving Location"><Sel value={form.locationId} onChange={e=>setForm(p=>({...p,locationId:e.target.value}))}>{locations.filter(l=>l.active).map(l=><option key={l.id} value={l.id}>{l.name}{l.is_main?' (Main)':''}</option>)}</Sel></Field>
              <Field label="Expected Date"><Inp type="date" value={form.expectedDate} onChange={e=>setForm(p=>({...p,expectedDate:e.target.value}))}/></Field>
            </div>
            <Field label="Notes"><Inp value={form.notes} onChange={e=>setForm(p=>({...p,notes:e.target.value}))}/></Field>
            <div className="divider"/>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
              <div style={{fontWeight:600,fontSize:13}}>Line Items</div>
              <button type="button" className="btn btn-secondary btn-sm" onClick={addLine}>{Icons.plus}Add Line</button>
            </div>
            {form.lines.map((line,idx)=>(
              <div key={line.id} className="pol">
                <Field label={idx===0?'Item *':''}>
                  <div style={{display:'flex',gap:6}}>
                    <div style={{flex:1}}>
                      <Sel value={line.itemId} onChange={e=>{const it=items.find(i=>i.id===e.target.value);updLine(line.id,'itemId',e.target.value);if(it)updLine(line.id,'unitPrice',it.price+'')}} required><option value="">Select…</option>{items.map(i=><option key={i.id} value={i.id}>{i.name} ({i.sku})</option>)}</Sel>
                    </div>
                    <ScanButton onScan={code=>handleLineScan(line.id,code)}/>
                  </div>
                </Field>
                <Field label={idx===0?'Qty *':''}><Inp type="number" min="1" value={line.qty} onChange={e=>updLine(line.id,'qty',e.target.value)} required/></Field>
                <div className="pol-price"><Field label={idx===0?'Unit Price ($)':''} ><Inp type="number" step="0.01" min="0" value={line.unitPrice} onChange={e=>updLine(line.id,'unitPrice',e.target.value)} required/></Field></div>
                <div className="pol-sub"><Field label={idx===0?'Subtotal':''}><div style={{padding:'8px 0',fontWeight:700,color:'var(--sky-800)'}}>{fmt$((+line.qty||0)*(+line.unitPrice||0))}</div></Field></div>
                <div style={{alignSelf:'flex-end',paddingBottom:13}}>{form.lines.length>1&&<button type="button" className="btn btn-ghost btn-icon btn-sm" style={{color:'var(--red-500)'}} onClick={()=>remLine(line.id)}>{Icons.trash}</button>}</div>
              </div>
            ))}
            <div style={{textAlign:'right',fontWeight:700,color:'var(--sky-900)',fontSize:14,marginTop:6}}>
              Total: {fmt$(form.lines.reduce((s,l)=>s+(+l.qty||0)*(+l.unitPrice||0),0))}
            </div>
          </form>
        </Modal>
      )}
      {confirm&&<Confirm msg={confirm.msg} onYes={confirm.onYes} onNo={()=>setConfirm(null)}/>}
    </div>
  )
}
