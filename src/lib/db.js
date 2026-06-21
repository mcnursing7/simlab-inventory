import { supabase } from './supabase'

const ok = ({ data, error }) => { if (error) throw error; return data }

// Locations
export const getLocations   = () => supabase.from('locations').select('*').eq('active',true).order('name').then(ok)
export const createLocation = (d) => supabase.from('locations').insert(d).select().single().then(ok)
export const updateLocation = (id,d) => supabase.from('locations').update(d).eq('id',id).then(ok)
export const deleteLocation = (id) => supabase.from('locations').update({active:false}).eq('id',id).then(ok)

// Vendors
export const getVendors   = () => supabase.from('vendors').select('*').eq('active',true).order('name').then(ok)
export const createVendor = (d) => supabase.from('vendors').insert(d).select().single().then(ok)
export const updateVendor = (id,d) => supabase.from('vendors').update(d).eq('id',id).then(ok)
export const deleteVendor = (id) => supabase.from('vendors').update({active:false}).eq('id',id).then(ok)

// Items
export const getItems   = () => supabase.from('items').select('*').eq('active',true).order('name').then(ok)
export const createItem = (d) => supabase.from('items').insert(d).select().single().then(ok)
export const updateItem = (id,d) => supabase.from('items').update(d).eq('id',id).then(ok)
export const deleteItem = (id) => supabase.from('items').update({active:false}).eq('id',id).then(ok)

// Inventory
export const getInventory = () => supabase.from('inventory').select('*').then(ok)

// POs
export const getPOs = () => supabase.from('purchase_orders')
  .select('*, vendor:vendors(id,name), location:locations(id,name,code), lines:po_lines(*, item:items(id,sku,name,unit,price))')
  .order('created_at', { ascending: false }).then(ok)

export const createPO = async (poData, lines) => {
  const { data: num } = await supabase.rpc('next_po_number')
  const po = await supabase.from('purchase_orders').insert({
    number: num, vendor_id: poData.vendorId, location_id: poData.locationId,
    status: 'open', expected_date: poData.expectedDate || null,
    notes: poData.notes || '', created_by: poData.createdBy,
  }).select().single().then(ok)
  await supabase.from('po_lines').insert(
    lines.map(l => ({ po_id: po.id, item_id: l.itemId, qty: +l.qty, unit_price: +l.unitPrice, received: 0, note: l.note || '' }))
  ).then(ok)
  return po
}

export const cancelPO = (id) => supabase.from('purchase_orders').update({ status: 'cancelled' }).eq('id', id).then(ok)

export const receivePO = async (po, quantities, note, userId) => {
  const promises = []
  const txs = []
  for (const line of po.lines) {
    const qty = parseInt(quantities[line.id] || 0)
    if (qty <= 0) continue
    promises.push(supabase.from('po_lines').update({ received: (line.received||0) + qty }).eq('id', line.id).then(ok))
    promises.push(supabase.rpc('adjust_inventory', { p_item_id: line.item_id, p_location_id: po.location_id, p_delta: qty }).then(ok))
    txs.push({ type: 'receiving', item_id: line.item_id, location_id: po.location_id, qty, ref_id: po.id, note: note || `Receipt via ${po.number}`, user_id: userId })
  }
  await Promise.all(promises)
  if (txs.length) await supabase.from('transactions').insert(txs).then(ok)
  const lines2 = await supabase.from('po_lines').select('qty,received').eq('po_id', po.id).then(ok)
  const total = lines2.reduce((s,l)=>s+l.qty,0), recv = lines2.reduce((s,l)=>s+l.received,0)
  const status = recv >= total ? 'received' : recv > 0 ? 'partial' : 'open'
  await supabase.from('purchase_orders').update({ status, received_date: status!=='open' ? new Date().toISOString().split('T')[0] : null }).eq('id', po.id).then(ok)
  return status
}

// Adjustments
export const createAdjustment = async ({ itemId, locationId, qty, adjCategory, note, userId }) => {
  const inv = await supabase.from('inventory').select('qty').eq('item_id',itemId).eq('location_id',locationId).maybeSingle().then(ok)
  if (qty < 0 && (!inv || inv.qty < Math.abs(qty))) throw new Error(`Insufficient stock. Available: ${inv?.qty || 0}`)
  await supabase.rpc('adjust_inventory', { p_item_id: itemId, p_location_id: locationId, p_delta: qty }).then(ok)
  return supabase.from('transactions').insert({ type:'adjustment', item_id:itemId, location_id:locationId, qty, adj_category:adjCategory, note, user_id:userId }).select().single().then(ok)
}

// Transfers
export const createTransfer = async ({ itemId, fromLocationId, toLocationId, qty, note, userId }) => {
  const inv = await supabase.from('inventory').select('qty').eq('item_id',itemId).eq('location_id',fromLocationId).maybeSingle().then(ok)
  if (!inv || inv.qty < qty) throw new Error(`Insufficient stock. Available: ${inv?.qty || 0}`)
  await supabase.rpc('adjust_inventory', { p_item_id:itemId, p_location_id:fromLocationId, p_delta:-qty }).then(ok)
  await supabase.rpc('adjust_inventory', { p_item_id:itemId, p_location_id:toLocationId,   p_delta: qty }).then(ok)
  return supabase.from('transactions').insert({ type:'transfer', item_id:itemId, location_id:fromLocationId, to_location_id:toLocationId, qty, note:note||'', user_id:userId }).select().single().then(ok)
}

// Transactions
// Both location FK hints are required — transactions has two FKs to locations
// (location_id and to_location_id) so PostgREST needs explicit hints for both
export const getTransactions = (filters={}) => {
  let q = supabase.from('transactions')
    .select('*, item:items(id,name,sku,unit), location:locations!transactions_location_id_fkey(id,name), to_location:locations!transactions_to_location_id_fkey(id,name), user:profiles(id,name)')
    .order('created_at', { ascending: false })
  if (filters.type)       q = q.eq('type', filters.type)
  if (filters.locationId) q = q.eq('location_id', filters.locationId)
  if (filters.from)       q = q.gte('date', filters.from)
  if (filters.to)         q = q.lte('date', filters.to)
  return q.then(ok)
}

// Profiles
export const getProfiles   = () => supabase.from('profiles').select('*').order('name').then(ok)
export const updateProfile = (id,d) => supabase.from('profiles').update(d).eq('id',id).then(ok)

// ── User management via Edge Function ────────────────────────
// Calls the manage-user edge function which runs server-side with service role key

async function callManageUser(payload) {
  const { supabase } = await import('./supabase.js')
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Not authenticated')

  const url = import.meta.env.VITE_SUPABASE_URL + '/functions/v1/manage-user'
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + session.access_token,
    },
    body: JSON.stringify(payload),
  })
  const data = await res.json()
  if (data.error) throw new Error(data.error)
  return data
}

export const createUser = (name, email, password, role) =>
  callManageUser({ action: 'create', name, email, password, role })

export const updateUserPassword = (userId, password) =>
  callManageUser({ action: 'update_password', userId, password })

export const updateUserEmail = (userId, email) =>
  callManageUser({ action: 'update_email', userId, email })
