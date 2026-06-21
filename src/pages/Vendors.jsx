import React,{useState} from 'react'
import {useData} from '../hooks/useData'
import {createVendor,updateVendor,deleteVendor} from '../lib/db'
import {Icons,Modal,Confirm,Field,Inp,Txt} from '../components/UI'
import toast from 'react-hot-toast'

export default function Vendors({user}){
  const {vendors,pos,reload}=useData()
  const canEdit=user.role!=='lab_staff'
  const [modal,setModal]=useState(null)
  const [confirm,setConfirm]=useState(null)
  const EF={name:'',email:'',phone:'',contact:'',address:'',website:'',notes:''}
  const [form,setForm]=useState(EF)
  const f=k=>e=>setForm(p=>({...p,[k]:e.target.value}))
  const save=async e=>{
    e.preventDefault()
    try{if(modal==='add') await createVendor(form);else await updateVendor(modal.id,form);await reload();setModal(null);toast.success('Saved')}
    catch(e){toast.error(e.message)}
  }
  return(
    <div>
      {canEdit&&<div style={{marginBottom:14}}><button className="btn btn-primary" onClick={()=>{setForm(EF);setModal('add')}}>{Icons.plus}Add Vendor</button></div>}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',gap:14}}>
        {vendors.filter(v=>v.active).map(v=>{
          const poCnt=pos.filter(p=>p.vendor_id===v.id).length
          return(
            <div key={v.id} className="card" style={{padding:18}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:12}}>
                <div style={{display:'flex',gap:11,alignItems:'center'}}>
                <div><div style={{fontWeight:700,fontSize:14}}>{v.name}</div><div style={{fontSize:12,color:'var(--sl-400)'}}>{v.contact}</div></div>
                </div>
                {canEdit&&<div style={{display:'flex',gap:3}}>
                  <button className="btn btn-ghost btn-icon btn-sm" onClick={()=>{setForm({...v});setModal(v)}}>{Icons.edit}</button>
                  <button className="btn btn-ghost btn-icon btn-sm" style={{color:'var(--red-500)'}} onClick={()=>setConfirm({msg:`Delete "${v.name}"?`,onYes:async()=>{await deleteVendor(v.id);await reload();setConfirm(null)}})}>{Icons.trash}</button>
                </div>}
              </div>
              <div style={{fontSize:13,color:'var(--sl-600)',display:'flex',flexDirection:'column',gap:5}}>
                {v.email&&<div style={{display:'flex',gap:6,alignItems:'center'}}><span style={{color:'var(--sky-500)',flexShrink:0,width:14,height:14}}>{Icons.mail}</span>{v.email}</div>}
                {v.phone&&<div style={{display:'flex',gap:6,alignItems:'center'}}><span style={{color:'var(--sky-500)',flexShrink:0,width:14,height:14}}>{Icons.phone}</span>{v.phone}</div>}
                {v.address&&<div style={{fontSize:12,color:'var(--sl-400)',marginTop:4}}>{v.address}</div>}
              </div>
              <div style={{marginTop:10,paddingTop:10,borderTop:'1px solid var(--sl-100)',display:'flex',justifyContent:'space-between'}}>
                <span className="badge badge-blue">{poCnt} PO{poCnt!==1?'s':''}</span>
                {v.notes&&<span style={{fontSize:11,color:'var(--sl-400)'}}>{v.notes}</span>}
              </div>
            </div>
          )
        })}
      </div>
      {modal&&<Modal title={modal==='add'?'Add Vendor':'Edit Vendor'} onClose={()=>setModal(null)}
        footer={<><button className="btn btn-secondary" onClick={()=>setModal(null)}>Cancel</button><button className="btn btn-primary" onClick={()=>document.getElementById('vform').requestSubmit()}>{Icons.check}Save</button></>}>
        <form id="vform" onSubmit={save}>
          <Field label="Vendor Name *"><Inp value={form.name} onChange={f('name')} required/></Field>
          <div className="fr2"><Field label="Email"><Inp type="email" value={form.email} onChange={f('email')}/></Field><Field label="Phone"><Inp value={form.phone} onChange={f('phone')}/></Field></div>
          <div className="fr2"><Field label="Contact Person"><Inp value={form.contact} onChange={f('contact')}/></Field><Field label="Website"><Inp value={form.website} onChange={f('website')}/></Field></div>
          <Field label="Address"><Txt value={form.address} onChange={f('address')} rows={2}/></Field>
          <Field label="Notes (payment terms etc.)"><Inp value={form.notes} onChange={f('notes')}/></Field>
        </form>
      </Modal>}
      {confirm&&<Confirm msg={confirm.msg} onYes={confirm.onYes} onNo={()=>setConfirm(null)}/>}
    </div>
  )
}
