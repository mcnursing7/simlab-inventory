import React,{useState} from 'react'
import {useData} from '../hooks/useData'
import {receivePO} from '../lib/db'
import {useAuth} from '../hooks/useAuth'
import {Icons,Modal,Field,Inp,fmtDate,PO_STATUS_CLS} from '../components/UI'
import toast from 'react-hot-toast'

export default function Receiving(){
  const {pos,vendors,locations,items,reload}=useData()
  const {user}=useAuth()
  const [sel,setSel]=useState(null)
  const [qtys,setQtys]=useState({})
  const [note,setNote]=useState('')
  const [saving,setSaving]=useState(false)
  const openPOs=pos.filter(p=>p.status==='open'||p.status==='partial')

  const receive=async()=>{
    setSaving(true)
    try{await receivePO(sel,qtys,note,user.id);await reload();setSel(null);setQtys({});setNote('');toast.success('Receipt recorded')}
    catch(e){toast.error(e.message)}finally{setSaving(false)}
  }
  return(
    <div>
      {openPOs.length===0&&<div className="alert alert-success">{Icons.check}<span>All purchase orders have been fully received.</span></div>}
      <div className="card">
        <div className="card-header"><div className="card-title">Open & Partial Purchase Orders</div></div>
        <div className="tw"><table className="dt"><thead><tr>
          <th>PO #</th><th>Vendor</th><th>Date</th><th className="hide-mobile">Location</th><th>Lines</th><th>Status</th><th></th>
        </tr></thead><tbody>
          {openPOs.map(po=>{
            const v=vendors.find(x=>x.id===po.vendor_id)
            const loc=locations.find(l=>l.id===po.location_id)
            return(
              <tr key={po.id}>
                <td><span className="sku-chip">{po.number}</span></td>
                <td style={{fontWeight:600}}>{v?.name}</td>
                <td>{fmtDate(po.date)}</td>
                <td className="hide-mobile"><span className="loc-chip">{loc?.name}</span></td>
                <td>{(po.lines||[]).length}</td>
                <td><span className={`badge ${PO_STATUS_CLS[po.status]}`}>{po.status}</span></td>
                <td><button className="btn btn-primary btn-sm" onClick={()=>{setSel(po);setQtys({});setNote('')}}>{Icons.download}Receive</button></td>
              </tr>
            )
          })}
          {openPOs.length===0&&<tr><td colSpan={7}><div className="empty">{Icons.receipt}<p>No open POs</p></div></td></tr>}
        </tbody></table></div>
      </div>
      {sel&&(
        <Modal title={`Receive: ${sel.number}`} onClose={()=>setSel(null)} size="modal-xl"
          footer={<><button className="btn btn-secondary" onClick={()=>setSel(null)}>Cancel</button><button className="btn btn-primary" onClick={receive} disabled={saving}>{saving?<div className="spin"/>:Icons.check}Confirm Receipt</button></>}>
          <div className="alert alert-info">{Icons.info}<span>Enter qty received for each line. Leave blank for items not yet received.</span></div>
          <table className="dt"><thead><tr><th>Item</th><th className="hide-mobile">SKU</th><th>Ordered</th><th>Prior</th><th>Remaining</th><th>Receiving Now</th></tr></thead><tbody>
            {(sel.lines||[]).map(l=>{
              const it=items.find(i=>i.id===l.item_id)
              const rem=l.qty-(l.received||0)
              return(
                <tr key={l.id}>
                  <td style={{fontWeight:600}}>{it?.name}</td>
                  <td className="hide-mobile"><span className="sku-chip">{it?.sku}</span></td>
                  <td>{l.qty} {it?.unit}</td>
                  <td>{l.received||0}</td>
                  <td style={{fontWeight:700,color:rem>0?'var(--amber-700)':'var(--green-600)'}}>{rem}</td>
                  <td><Inp type="number" min="0" max={rem} value={qtys[l.id]||''} onChange={e=>setQtys(p=>({...p,[l.id]:e.target.value}))} style={{width:90}} placeholder={`0–${rem}`}/></td>
                </tr>
              )
            })}
          </tbody></table>
          <div style={{marginTop:14}}><Field label="Receipt Note"><Inp value={note} onChange={e=>setNote(e.target.value)} placeholder="Optional…"/></Field></div>
        </Modal>
      )}
    </div>
  )
}
