import { useEffect, useState } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('Initial session:', session)
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
      // Mark auth as ready after initial load
      setIsReady(true)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state change:', event, session)
      
      // Handle token refresh events
      if (event === 'TOKEN_REFRESHED' && session) {
        console.log('Token refreshed successfully, new expiry:', session.expires_at)
        // Dispatch event for components that need to refetch data with new token
        window.dispatchEvent(new CustomEvent('tokenRefreshed', { detail: { session } }))
      }
      
      // Handle session expiry or sign out
      if (event === 'SIGNED_OUT' || (!session && (event === 'TOKEN_REFRESHED' || event === 'USER_DELETED'))) {
        console.log('Session expired or user signed out')
        setSession(null)
        setUser(null)
        setLoading(false)
        setIsReady(true)
        // Redirect to auth page if not already there
        if (window.location.pathname !== '/auth') {
          window.location.href = '/auth'
        }
        return
      }
      
      // Update state with new session
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
      setIsReady(true)
      
      // Handle OAuth redirects
      if (event === 'SIGNED_IN' && session && window.location.pathname === '/auth') {
        window.location.href = '/dashboard'
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  return {
    user,
    session,
    loading,
    isAuthenticated: !!user,
    isReady,
  }
}