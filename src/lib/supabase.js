import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY
if (!url || !key) throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY in .env')

export const supabase = createClient(url, key)

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error

  // Verify the profile is active — block login for deactivated users
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('active')
    .eq('id', data.user.id)
    .single()

  if (profileError || !profile) {
    await supabase.auth.signOut()
    throw new Error('Could not verify account status. Please contact an administrator.')
  }

  if (!profile.active) {
    await supabase.auth.signOut()
    throw new Error('This account has been deactivated. Please contact an administrator.')
  }

  return data
}

export async function signOut() { await supabase.auth.signOut() }

export async function getCurrentProfile() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (error) throw error

  // Defensive check: if somehow an inactive user has a lingering session, kill it
  if (!data.active) {
    await supabase.auth.signOut()
    return null
  }

  return { ...data, email: user.email }
}
