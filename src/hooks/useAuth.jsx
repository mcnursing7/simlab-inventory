import React, { createContext, useContext, useState, useEffect } from 'react'
import { supabase, getCurrentProfile } from '../lib/supabase'

const Ctx = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getCurrentProfile().then(p => { setUser(p); setLoading(false) }).catch(() => setLoading(false))
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === 'SIGNED_IN')  { const p = await getCurrentProfile(); setUser(p) }
      if (event === 'SIGNED_OUT') { setUser(null) }
    })
    return () => subscription.unsubscribe()
  }, [])

  return <Ctx.Provider value={{ user, setUser, loading }}>{children}</Ctx.Provider>
}

export const useAuth = () => useContext(Ctx)
