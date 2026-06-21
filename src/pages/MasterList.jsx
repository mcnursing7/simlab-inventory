import React,{useState,useMemo,useRef,useEffect} from 'react'
import JsBarcode from 'jsbarcode'
import QRCode from 'qrcode'
import { useData,totalOnHand } from '../hooks/useData'
import { createItem,updateItem,deleteItem } from '../lib/db'
import { Icons,Modal,Confirm,Field,Inp,Sel,Txt,fmt$,CATS } from '../components/UI'
import toast from 'react-hot-toast'

function LabelModal({item,onClose}) {
  const svgRef=useRef(); const canvRef=useRef()
  const [mode,setMode]=useState('barcode')
  useEffect(()=>{
    if(mode==='barcode'&&svgRef.current) try{JsBarcode(svgRef.current,item.sku,{format:'CODE128',height:70,fontSize:14,margin:10,lineColor:'#0c4a6e',background:'#fff',displayValue:true})}catch(e){}
    if(mode==='qr'&&canvRef.current) try{QRCode.toCanvas(canvRef.current,JSON.stringify({sku:item.sku,name:item.name,id:item.id}),{width:200,color:{dark:'#0c4a6e'}})}catch(e){}
  },[mode,item])
  const print=()=>{
    const w=window.open('','_blank','width=460,height=340')
    const qrs=mode==='qr'?`<script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js"><\/script>`:''
    const body=mode==='barcode'?`<svg>${svgRef.current?.innerHTML||''}</svg>`:`<canvas id="qc"></canvas>`
    const init=mode==='qr'?`QRCode.toCanvas(document.getElementById('qc'),${JSON.stringify(JSON.stringify({sku:item.sku,name:item.name}))},{width:200},()=>setTimeout(()=>window.print(),200))`:`setTimeout(()=>window.print(),200)`
    w.document.write(`<!DOCTYPE html><html><head><title>Label</title>${qrs}<style>body{font-family:system-ui;text-align:center;padding:20px}h3{color:#0c4a6e;font-size:15px;margin:0 0 3px}p{font-size:12px;color:#64748b;margin:0 0 12px}svg{max-width:100%}</style></head><body><h3>${item.name}</h3><p>SKU: ${item.sku} · ${item.category} · ${item.unit}</p>${body}<script>${init}<\/script></body></html>`)
    w.document.close()
  }
  return (
    <Modal title={`Label: ${item.name}`} onClose={onClose} footer={<><button className="btn btn-secondary" onClick={onClose}>Close</button><button className="btn btn-primary" onClick={print}>{Icons.print}Print Label</button></>}>
      <div className="tab-bar"><div className={`tab${mode==='barcode'?' active':''}`} onClick={()=>setMode('barcode')}>Barcode</div><div className={`tab${mode==='qr'?' active':''}`} onClick={()=>setMode('qr')}>QR Code</div></div>
      <div style={{textAlign:'center',padding:'10px 0'}}>
        <div style={{background:'#fff',padding:16,borderRadius:10,border:'1px solid var(--sky-100)',display:'inline-block'}}>
          {mode==='barcode'&&<svg ref={svgRef}/>}{mode==='qr'&&<canvas ref={canvRef}/>}
        </div>
        <div style={{marginTop:10,fontWeight:600,color:'var(--sky-900)'}}>{item.name}</div>
        <div style={{fontSize:12,color:'var(--sl-400)',marginTop:2}}>SKU: <span style={{fontFamily:'var(--mono)'}}>{item.sku}</span></div>
      </div>
      <div className="alert alert-info" style={{marginTop:14}}>{Icons.info}<span>Scan with a keyboard barcode reader — focus any SKU field first.</span></div>
    </Modal>
  )
}

const EF={sku:'',name:'',category:'',unit:'',price:'',min_qty:'',max_qty:'',vendor_id:'',notes:''}

export default function MasterList() {
  const {items,vendors,inventory,reload}=useData()
  const [search,setSearch]=useState('')
  const [catF,setCatF]=useState('')
  const [modal,setModal]=useState(null)
  const [bcItem,setBcItem]=useState(null)
  const [confirm,setConfirm]=useState(null)
  const [form,setForm]=useState(EF)
  const [saving,setSaving]=useState(false)

  const filtered=useMemo(()=>items.filter(i=>
    (search===''||i.name.toLowerCase().includes(search.toLowerCase())||i.sku.toLowerCase().includes(search.toLowerCase())||i.category.toLowerCase().includes(search.toLowerCase()))&&
    (catF===''||i.category===catF)
  ),[items,search,catF])

  const handleScan=e=>{
    if(e.key==='Enter'&&e.target.value.trim()){
      const found=items.find(i=>i.sku===e.target.value.trim())
      if(found){setForm({...found,price:found.price+'',min_qty:found.min_qty+'',max_qty:found.max_qty+'',vendor_id:found.vendor_id||''});setModal(found)}
      else toast.error('No item found: '+e.target.value.trim())
      setSearch('');e.target.value=''
    } else setSearch(e.target.value)
  }

  const f=k=>e=>setForm(p=>({...p,[k]:e.target.value}))

  const save=async e=>{
    e.preventDefault();setSaving(true)
    try{
      const body={...form,price:+form.price,min_qty:+form.min_qty,max_qty:+form.max_qty,vendor_id:form.vendor_id||null}
      if(modal==='add') await createItem(body)
      else await updateItem(modal.id,body)
      await reload();setModal(null);toast.success(modal==='add'?'Item added':'Item updated')
    }catch(e){toast.error(e.message)}finally{setSaving(false)}
  }

  const del=item=>setConfirm({msg:`Deactivate "${item.name}"?`,onYes:async()=>{await deleteItem(item.id);await reload();setConfirm(null);toast.success('Item deactivated')}})

  return (
    <div>
      <div style={{display:'flex',gap:10,marginBottom:16,flexWrap:'wrap'}}>
        <div className="search-wrap">{Icons.barcode}<input className="search-input" onChange={handleScan} onKeyDown={handleScan} placeholder="Scan barcode or search by name / SKU / category…" style={{paddingLeft:32}}/></div>
        <select className="fi" style={{width:160}} value={catF} onChange={e=>setCatF(e.target.value)}>
          <option value="">All categories</option>{CATS.map(c=><option key={c} value={c}>{c}</option>)}
        </select>
        <button className="btn btn-primary" onClick={()=>{setForm(EF);setModal('add')}}>{Icons.plus}Add Item</button>
      </div>
      <div className="card"><div className="tw"><table className="dt"><thead><tr>
        <th>SKU</th><th>Name</th><th>Category</th><th className="hide-mobile">Unit</th><th>Price</th><th className="hide-mobile">Min/Max</th><th>On Hand</th><th>Value</th><th></th>
      </tr></thead><tbody>
        {filtered.map(item=>{
          const qty=totalOnHand(inventory,item.id)
          const low=qty<=item.min_qty
          return(
            <tr key={item.id}>
              <td><span className="sku-chip">{item.sku}</span></td>
              <td style={{fontWeight:600}}>{item.name}</td>
              <td><span className="badge badge-blue">{item.category}</span></td>
              <td className="hide-mobile" style={{color:'var(--sl-500)'}}>{item.unit}</td>
              <td style={{fontWeight:600}}>{fmt$(item.price)}</td>
              <td className="hide-mobile" style={{fontSize:12,fontFamily:'var(--mono)',color:'var(--sl-500)'}}>{item.min_qty}/{item.max_qty}</td>
              <td><span style={{fontWeight:700,color:low?'var(--red-600)':'var(--sl-800)'}}>{qty}</span>{low&&<span className="badge badge-red" style={{marginLeft:5}}>Low</span>}</td>
              <td style={{fontWeight:600}}>{fmt$(qty*item.price)}</td>
              <td><div style={{display:'flex',gap:3}}>
                <button className="btn btn-ghost btn-icon btn-sm" title="Print label" onClick={()=>setBcItem(item)}>{Icons.barcode}</button>
                <button className="btn btn-ghost btn-icon btn-sm" onClick={()=>{setForm({...item,price:item.price+'',min_qty:item.min_qty+'',max_qty:item.max_qty+'',vendor_id:item.vendor_id||''});setModal(item)}}>{Icons.edit}</button>
                <button className="btn btn-ghost btn-icon btn-sm" style={{color:'var(--red-500)'}} onClick={()=>del(item)}>{Icons.trash}</button>
              </div></td>
            </tr>
          )
        })}
        {filtered.length===0&&<tr><td colSpan={9}><div className="empty">{Icons.package}<p>No items found</p><span>Adjust search or add a new item</span></div></td></tr>}
      </tbody></table></div></div>
      {bcItem&&<LabelModal item={bcItem} onClose={()=>setBcItem(null)}/>}
      {modal&&(
        <Modal title={modal==='add'?'Add Item':'Edit Item'} onClose={()=>setModal(null)} size="modal-lg"
          footer={<><button className="btn btn-secondary" onClick={()=>setModal(null)}>Cancel</button><button className="btn btn-primary" onClick={()=>document.getElementById('iform').requestSubmit()} disabled={saving}>{saving?<div className="spin"/>:Icons.check}{modal==='add'?'Add Item':'Save'}</button></>}>
          <form id="iform" onSubmit={save}>
            <div className="fr2"><Field label="SKU *" note="unique"><Inp value={form.sku} onChange={f('sku')} placeholder="GLV-NIT-M" required/></Field>
            <Field label="Category *"><Sel value={form.category} onChange={f('category')} required><option value="">Select…</option>{CATS.map(c=><option key={c} value={c}>{c}</option>)}</Sel></Field></div>
            <Field label="Name *"><Inp value={form.name} onChange={f('name')} required/></Field>
            <div className="fr3">
              <Field label="Unit *"><Inp value={form.unit} onChange={f('unit')} placeholder="Box, Bottle…" required/></Field>
              <Field label="Price ($) *"><Inp type="number" step="0.01" min="0" value={form.price} onChange={f('price')} required/></Field>
              <Field label="Vendor"><Sel value={form.vendor_id||''} onChange={f('vendor_id')}><option value="">None</option>{vendors.map(v=><option key={v.id} value={v.id}>{v.name}</option>)}</Sel></Field>
            </div>
            <div className="fr2">
              <Field label="Min Qty *" note="low stock trigger"><Inp type="number" min="0" value={form.min_qty} onChange={f('min_qty')} required/></Field>
              <Field label="Max Qty *" note="reorder target"><Inp type="number" min="0" value={form.max_qty} onChange={f('max_qty')} required/></Field>
            </div>
            <Field label="Notes"><Txt value={form.notes||''} onChange={f('notes')} rows={2}/></Field>
          </form>
        </Modal>
      )}
      {confirm&&<Confirm msg={confirm.msg} onYes={confirm.onYes} onNo={()=>setConfirm(null)}/>}
    </div>
  )
}
