import { createClient } from '@supabase/supabase-js'

// Use environment variables directly with fallback for development
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || (typeof process !== 'undefined' && process.env.SUPABASE_URL)
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || (typeof process !== 'undefined' && process.env.SUPABASE_ANON_KEY)

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase environment variables:', {
    url: supabaseUrl ? 'present' : 'missing',
    key: supabaseAnonKey ? 'present' : 'missing'
  })
  throw new Error('Missing Supabase environment variables. Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce'
  }
})

// Auth helper functions
export const signUp = async (email: string, password: string, metadata: { firstName: string; lastName: string; company?: string }) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        firstName: metadata.firstName,
        lastName: metadata.lastName,
        company: metadata.company,
        first_name: metadata.firstName, // Also set standard field
        last_name: metadata.lastName   // Also set standard field
      }
    }
  })
  return { data, error }
}

export const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  })
  return { data, error }
}

export const signInWithGoogle = async () => {
  try {
    console.log('Starting Google OAuth with URL:', window.location.origin)
    
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + '/auth'
      }
    })
    
    if (error) {
      console.error('Google OAuth error:', error)
      throw error
    }
    
    console.log('Google OAuth response:', data)
    return { data, error }
  } catch (err: any) {
    console.error('Google OAuth exception:', err)
    
    // Check if it's a configuration error
    if (err.message?.includes('Provider not found') || err.message?.includes('provider')) {
      throw new Error('Google login is not configured. Please check your Supabase project settings.')
    }
    
    throw err
  }
}



export const signOut = async () => {
  const { error } = await supabase.auth.signOut()
  return { error }
}

export const getCurrentUser = () => {
  return supabase.auth.getUser()
}

export const getSession = () => {
  return supabase.auth.getSession()
}