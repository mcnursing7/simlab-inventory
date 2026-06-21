import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { getLocations, getVendors, getItems, getInventory, getPOs, getTransactions } from '../lib/db'
import { useAuth } from './useAuth'

const Ctx = createContext(null)

export function DataProvider({ children }) {
  // Wait for auth to resolve before doing ANY data fetch.
  // Without this, the first read on page load can race ahead of the
  // session being fully attached, and RLS silently returns empty
  // results (since auth.uid() briefly reads as null).
  const { user, loading: authLoading } = useAuth()

  const [state, setState] = useState({
    locations: [], vendors: [], items: [], inventory: [], pos: [], transactions: [],
    loading: true, error: null
  })

  const reload = useCallback(async () => {
    setState(s => ({ ...s, loading: true, error: null }))
    try {
      const [locations, vendors, items, inventory, pos, transactions] = await Promise.all([
        getLocations(), getVendors(), getItems(), getInventory(), getPOs(), getTransactions()
      ])
      setState({ locations, vendors, items, inventory, pos, transactions, loading: false, error: null })
    } catch (e) {
      setState(s => ({ ...s, loading: false, error: e.message }))
    }
  }, [])

  useEffect(() => {
    // Only fetch once auth has finished resolving AND we have a logged-in user.
    // If auth is still loading, or there's no user (login screen), don't fetch yet.
    if (authLoading) return
    if (!user) {
      setState(s => ({ ...s, loading: false }))
      return
    }
    reload()
    // Re-run whenever the user identity changes (e.g. login/logout/switch account)
  }, [authLoading, user?.id, reload])

  return <Ctx.Provider value={{ ...state, reload }}>{children}</Ctx.Provider>
}

export const useData = () => useContext(Ctx)

export function totalOnHand(inventory, itemId) {
  return inventory.filter(r => r.item_id === itemId).reduce((s, r) => s + r.qty, 0)
}
export function getLowItems(items, inventory) {
  return items.filter(item => totalOnHand(inventory, item.id) <= item.min_qty)
}
