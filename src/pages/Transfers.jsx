import React,{useState} from 'react'
import {useData} from '../hooks/useData'
import {createTransfer} from '../lib/db'
import {useAuth} from '../hooks/useAuth'
import {Icons,Modal,Field,Inp,Sel,fmtDate} from '../components/UI'
import ScanButton from '../components/ScanButton'
import toast from 'react-hot-toast'

export default function Transfers(){
  const {items,locations,inventory,transactions,reload}=useData()
  const {user}=useAuth()
  const [modal,setModal]=useState(false)
  const [saving,setSaving]=useState(false)
  const EF={itemId:'',fromLocationId:'',toLocationId:'',qty:'',note:''}
  const [form,setForm]=useState(EF)
  const f=k=>e=>setForm(p=>({...p,[k]:e.target.value}))
  const txs=[...transactions].filter(t=>t.type==='transfer').sort((a,b)=>new Date(b.created_at)-new Date(a.created_at))

  const save=async e=>{
    e.preventDefault();setSaving(true)
    try{
      await createTransfer({itemId:form.itemId,fromLocationId:form.fromLocationId,toLocationId:form.toLocationId,qty:+form.qty,note:form.note,userId:user.id})
      await reload();setModal(false);setForm(EF);toast.success('Transfer recorded')
    }catch(e){toast.error(e.message)}finally{setSaving(false)}
  }

  const handleItemScan=code=>{
    const value=code.trim().toLowerCase()
    const match=items.find(i=>i.sku.toLowerCase()===value||String(i.id).toLowerCase()===value)
    if(match){
      setForm(p=>({...p,itemId:match.id}))
      toast.success(`Selected ${match.name}`)
    }else{
      toast.error(`No item found for "${code.trim()}"`)
    }
  }

  const avail=form.itemId&&form.fromLocationId?inventory.find(r=>r.item_id===form.itemId&&r.location_id===form.fromLocationId)?.qty||0:null

  return(
    <div>
      <div style={{marginBottom:14}}><button className="btn btn-primary" onClick={()=>{setForm(EF);setModal(true)}}>{Icons.plus}New Transfer</button></div>
      <div className="card"><div className="tw"><table className="dt"><thead><tr>
        <th>Date</th><th>Item</th><th>From</th><th>To</th><th>Qty</th><th className="hide-mobile">Note</th>
      </tr></thead><tbody>
        {txs.map(t=>{
          const it=items.find(i=>i.id===t.item_id)
          const from=locations.find(l=>l.id===t.location_id)
          const to=locations.find(l=>l.id===t.to_location_id)
          return(
            <tr key={t.id}>
              <td>{fmtDate(t.date)}</td>
              <td style={{fontWeight:600}}>{it?.name}</td>
              <td><span className="loc-chip">{from?.name}</span></td>
              <td><span className="badge badge-green">{to?.name}</span></td>
              <td style={{fontWeight:700}}>{t.qty}</td>
              <td className="hide-mobile" style={{fontSize:12,color:'var(--sl-500)'}}>{t.note}</td>
            </tr>
          )
        })}
        {txs.length===0&&<tr><td colSpan={6}><div className="empty">{Icons.arrows}<p>No transfers yet</p></div></td></tr>}
      </tbody></table></div></div>
      {modal&&(
        <Modal title="Transfer Inventory Between Locations" onClose={()=>setModal(false)}
          footer={<><button className="btn btn-secondary" onClick={()=>setModal(false)}>Cancel</button><button className="btn btn-primary" onClick={()=>document.getElementById('tform').requestSubmit()} disabled={saving}>{saving?<div className="spin"/>:Icons.check}Transfer</button></>}>
          <form id="tform" onSubmit={save}>
            <Field label="Item *">
              <div style={{display:'flex',gap:8}}>
                <div style={{flex:1}}>
                  <Sel value={form.itemId} onChange={f('itemId')} required><option value="">Select item…</option>{items.map(i=><option key={i.id} value={i.id}>{i.name} ({i.sku})</option>)}</Sel>
                </div>
                <ScanButton onScan={handleItemScan}/>
              </div>
            </Field>
            <div className="fr2">
              <Field label="From Location *"><Sel value={form.fromLocationId} onChange={f('fromLocationId')} required><option value="">Select…</option>{locations.filter(l=>l.active).map(l=><option key={l.id} value={l.id}>{l.name}</option>)}</Sel></Field>
              <Field label="To Location *"><Sel value={form.toLocationId} onChange={f('toLocationId')} required><option value="">Select…</option>{locations.filter(l=>l.active).map(l=><option key={l.id} value={l.id}>{l.name}</option>)}</Sel></Field>
            </div>
            <Field label="Quantity *"><Inp type="number" min="1" value={form.qty} onChange={f('qty')} required/></Field>
            {avail!==null&&<div style={{padding:'9px 12px',background:'var(--sky-50)',borderRadius:8,fontSize:13,color:'var(--sky-800)',border:'1px solid var(--sky-200)',marginBottom:12}}>Available at source: <strong>{avail} {items.find(i=>i.id===form.itemId)?.unit}</strong></div>}
            <Field label="Note"><Inp value={form.note} onChange={f('note')} placeholder="Reason or description…"/></Field>
          </form>
        </Modal>
      )}
    </div>
  )
}
