import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Middleware to verify Supabase JWT tokens
export async function verifySupabaseToken(token: string) {
  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
    
    if (error || !user) {
      return { success: false, error: error?.message || 'Invalid token' }
    }
    
    return { 
      success: true, 
      user: {
        id: user.id,
        email: user.email,
        firstName: user.user_metadata?.firstName || user.user_metadata?.first_name,
        lastName: user.user_metadata?.lastName || user.user_metadata?.last_name,
        company: user.user_metadata?.company,
        verified: user.email_confirmed_at !== null
      }
    }
  } catch (error) {
    return { success: false, error: 'Token verification failed' }
  }
}