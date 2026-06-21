import React,{useState} from 'react'
import {useData,totalOnHand} from '../hooks/useData'
import {createLocation,updateLocation,deleteLocation} from '../lib/db'
import {Icons,Modal,Confirm,Field,Inp,Txt,fmt$} from '../components/UI'
import toast from 'react-hot-toast'

export default function Locations({user}){
  const {locations,inventory,items,reload}=useData()
  const canEdit=user.role!=='lab_staff'
  const [modal,setModal]=useState(null)
  const [confirm,setConfirm]=useState(null)
  const EF={name:'',code:'',is_main:false,notes:''}
  const [form,setForm]=useState(EF)
  const f=k=>e=>setForm(p=>({...p,[k]:e.target.value}))
  const save=async e=>{
    e.preventDefault()
    try{
      if(modal==='add') await createLocation(form)
      else await updateLocation(modal.id,form)
      await reload();setModal(null);toast.success('Saved')
    }catch(e){toast.error(e.message)}
  }
  const del=loc=>{
    if(loc.is_main){toast.error('Cannot delete main receiving location');return}
    setConfirm({msg:`Delete location "${loc.name}"?`,onYes:async()=>{await deleteLocation(loc.id);await reload();setConfirm(null);toast.success('Deleted')}})
  }
  return(
    <div>
      {canEdit&&<div style={{marginBottom:14}}><button className="btn btn-primary" onClick={()=>{setForm(EF);setModal('add')}}>{Icons.plus}Add Location</button></div>}
      <div className="card"><div className="tw"><table className="dt"><thead><tr>
        <th>Name</th><th>Code</th><th>Type</th><th className="hide-mobile">Items</th><th className="hide-mobile">Value</th><th className="hide-mobile">Notes</th><th></th>
      </tr></thead><tbody>
        {locations.filter(l=>l.active).map(loc=>{
          const here=inventory.filter(r=>r.location_id===loc.id&&r.qty>0)
          const val=here.reduce((s,r)=>{const it=items.find(i=>i.id===r.item_id);return s+(it?r.qty*it.price:0)},0)
          return(
            <tr key={loc.id}>
              <td style={{fontWeight:700}}>{loc.name}</td>
              <td><span className="sku-chip">{loc.code}</span></td>
              <td>{loc.is_main?<span className="badge badge-blue">{Icons.star}Main</span>:<span className="badge badge-slate">Storage</span>}</td>
              <td className="hide-mobile">{here.length} types</td>
              <td className="hide-mobile" style={{fontWeight:600}}>{fmt$(val)}</td>
              <td className="hide-mobile" style={{fontSize:12,color:'var(--sl-500)'}}>{loc.notes}</td>
              <td>{canEdit&&<div style={{display:'flex',gap:3}}>
                <button className="btn btn-ghost btn-icon btn-sm" onClick={()=>{setForm({name:loc.name,code:loc.code,is_main:loc.is_main,notes:loc.notes||''});setModal(loc)}}>{Icons.edit}</button>
                <button className="btn btn-ghost btn-icon btn-sm" style={{color:'var(--red-500)'}} onClick={()=>del(loc)}>{Icons.trash}</button>
              </div>}</td>
            </tr>
          )
        })}
      </tbody></table></div></div>
      {modal&&<Modal title={modal==='add'?'Add Location':'Edit Location'} onClose={()=>setModal(null)}
        footer={<><button className="btn btn-secondary" onClick={()=>setModal(null)}>Cancel</button><button className="btn btn-primary" onClick={()=>document.getElementById('lform').requestSubmit()}>{Icons.check}Save</button></>}>
        <form id="lform" onSubmit={save}>
          <div className="fr2"><Field label="Name *"><Inp value={form.name} onChange={f('name')} required/></Field>
          <Field label="Code *"><Inp value={form.code} onChange={e=>setForm(p=>({...p,code:e.target.value.toUpperCase()}))} placeholder="MAIN" required/></Field></div>
          <Field label="Notes"><Inp value={form.notes||''} onChange={f('notes')}/></Field>
          <label style={{display:'flex',alignItems:'center',gap:10,cursor:'pointer',padding:'10px 0',borderTop:'1px solid var(--sl-100)'}}>
            <div className="toggle"><input type="checkbox" checked={!!form.is_main} onChange={e=>setForm(p=>({...p,is_main:e.target.checked}))}/><div className="toggle-slider"/></div>
            <div><div style={{fontSize:13,fontWeight:600}}>Main Receiving Location</div><div style={{fontSize:12,color:'var(--sl-400)'}}>POs received here by default</div></div>
          </label>
        </form>
      </Modal>}
      {confirm&&<Confirm msg={confirm.msg} onYes={confirm.onYes} onNo={()=>setConfirm(null)}/>}
    </div>
  )
}
