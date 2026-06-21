import React,{useState} from 'react'
import {useData} from '../hooks/useData'
import {createAdjustment} from '../lib/db'
import {useAuth} from '../hooks/useAuth'
import {Icons,Modal,Field,Inp,Sel,Txt,fmtDate,ADJ_CATS} from '../components/UI'
import toast from 'react-hot-toast'

export default function Adjustments(){
  const {items,locations,inventory,transactions,reload}=useData()
  const {user}=useAuth()
  const [modal,setModal]=useState(false)
  const [saving,setSaving]=useState(false)
  const EF={itemId:'',locationId:'',dir:'minus',qty:'',adjCategory:'Usage',note:''}
  const [form,setForm]=useState(EF)
  const f=k=>e=>setForm(p=>({...p,[k]:e.target.value}))
  const txs=[...transactions].filter(t=>t.type==='adjustment').sort((a,b)=>new Date(b.created_at)-new Date(a.created_at))
  const AdjCls={'Usage':'badge-amber','Discrepancy Correction':'badge-violet','Damaged':'badge-red','Expired':'badge-red','Returned':'badge-green','Other':'badge-slate'}

  const save=async e=>{
    e.preventDefault();setSaving(true)
    try{
      const qty=form.dir==='minus'?-Math.abs(+form.qty):Math.abs(+form.qty)
      await createAdjustment({itemId:form.itemId,locationId:form.locationId,qty,adjCategory:form.adjCategory,note:form.note,userId:user.id})
      await reload();setModal(false);setForm(EF);toast.success('Adjustment recorded')
    }catch(e){toast.error(e.message)}finally{setSaving(false)}
  }

  const curQty=form.itemId&&form.locationId?inventory.find(r=>r.item_id===form.itemId&&r.location_id===form.locationId)?.qty||0:null

  return(
    <div>
      <div style={{marginBottom:14}}><button className="btn btn-primary" onClick={()=>{setForm(EF);setModal(true)}}>{Icons.plus}New Adjustment</button></div>
      <div className="card"><div className="tw"><table className="dt"><thead><tr>
        <th>Date</th><th>Item</th><th className="hide-mobile">Location</th><th>Category</th><th>Qty</th><th className="hide-mobile">Note</th>
      </tr></thead><tbody>
        {txs.map(t=>{
          const it=items.find(i=>i.id===t.item_id)
          const loc=locations.find(l=>l.id===t.location_id)
          return(
            <tr key={t.id}>
              <td>{fmtDate(t.date)}</td>
              <td style={{fontWeight:600}}>{it?.name}<div style={{fontSize:11,fontFamily:'var(--mono)',color:'var(--sl-400)'}}>{it?.sku}</div></td>
              <td className="hide-mobile"><span className="loc-chip">{loc?.name}</span></td>
              <td><span className={`badge ${AdjCls[t.adj_category]||'badge-slate'}`}>{t.adj_category}</span></td>
              <td style={{fontWeight:700,color:t.qty>=0?'var(--green-600)':'var(--red-600)'}}>{t.qty>=0?'+':''}{t.qty}</td>
              <td className="hide-mobile" style={{fontSize:12,color:'var(--sl-500)'}}>{t.note}</td>
            </tr>
          )
        })}
        {txs.length===0&&<tr><td colSpan={6}><div className="empty">{Icons.sliders}<p>No adjustments yet</p></div></td></tr>}
      </tbody></table></div></div>
      {modal&&(
        <Modal title="Record Inventory Adjustment" onClose={()=>setModal(false)}
          footer={<><button className="btn btn-secondary" onClick={()=>setModal(false)}>Cancel</button><button className="btn btn-primary" onClick={()=>document.getElementById('aform').requestSubmit()} disabled={saving}>{saving?<div className="spin"/>:Icons.check}Save</button></>}>
          <form id="aform" onSubmit={save}>
            <Field label="Item *"><Sel value={form.itemId} onChange={f('itemId')} required><option value="">Select item…</option>{items.map(i=><option key={i.id} value={i.id}>{i.name} ({i.sku})</option>)}</Sel></Field>
            <Field label="Location *"><Sel value={form.locationId} onChange={f('locationId')} required><option value="">Select location…</option>{locations.filter(l=>l.active).map(l=><option key={l.id} value={l.id}>{l.name}</option>)}</Sel></Field>
            <Field label="Category *"><Sel value={form.adjCategory} onChange={f('adjCategory')}>{ADJ_CATS.map(c=><option key={c} value={c}>{c}</option>)}</Sel></Field>
            <div className="fr2">
              <Field label="Direction"><Sel value={form.dir} onChange={f('dir')}><option value="minus">Remove (−) from stock</option><option value="plus">Add (+) to stock</option></Sel></Field>
              <Field label="Quantity *"><Inp type="number" min="1" value={form.qty} onChange={f('qty')} required/></Field>
            </div>
            {curQty!==null&&<div style={{padding:'9px 12px',background:'var(--sky-50)',borderRadius:8,fontSize:13,color:'var(--sky-800)',border:'1px solid var(--sky-200)',marginBottom:12}}>Current on hand at location: <strong>{curQty} {items.find(i=>i.id===form.itemId)?.unit}</strong></div>}
            <Field label="Reason / Note *" note="required for audit trail"><Txt value={form.note} onChange={f('note')} placeholder="Describe reason for this adjustment…" rows={3}/></Field>
          </form>
        </Modal>
      )}
    </div>
  )
}
