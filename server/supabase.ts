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

// Import storage for user creation
import { storage } from './storage.js'
import { db } from './db.js'
import { userPrivacy } from '../shared/schema.js'

// Middleware to verify Supabase JWT tokens
export async function verifySupabaseToken(token: string) {
  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
    
    if (error || !user) {
      console.log('Token verification failed:', error?.message || 'Invalid token')
      return { success: false, error: error?.message || 'Invalid token' }
    }
    
    // Log token details for debugging
    console.log(`Token verified for user ID: ${user.id}, email: ${user.email}`)
    
    // Extract user info from Google/Supabase metadata
    const firstName = user.user_metadata?.firstName || 
                     user.user_metadata?.first_name || 
                     user.user_metadata?.full_name?.split(' ')[0] || 
                     user.user_metadata?.name?.split(' ')[0] || ''
    
    const lastName = user.user_metadata?.lastName || 
                    user.user_metadata?.last_name || 
                    user.user_metadata?.full_name?.split(' ').slice(1).join(' ') || 
                    user.user_metadata?.name?.split(' ').slice(1).join(' ') || ''
    
    // Ensure user exists in our database
    let dbUser = await storage.getUser(user.id)
    
    // If user not found by ID, check by email (handles ID mismatch cases)
    if (!dbUser && user.email) {
      console.log(`User not found by ID ${user.id}, checking by email ${user.email}`)
      const userByEmail = await storage.getUserByEmail(user.email)
      
      if (userByEmail) {
        // User exists but with different ID - this is the mismatch case
        console.log(`⚠️ User ID mismatch detected! Token ID: ${user.id}, DB ID: ${userByEmail.id}`)
        dbUser = userByEmail
      }
    }
    
    if (!dbUser) {
      // Create new user in our database with Supabase ID
      console.log(`Creating new user with ID ${user.id}`)
      dbUser = await storage.createUser({
        id: user.id,
        email: user.email || '',
        firstName: firstName,
        lastName: lastName,
        company: user.user_metadata?.company || null
      })
      
      // Create default privacy settings for new user
      const defaultPrivacySettings = [
        { userId: user.id, toggleName: 'portfolio', isEnabled: false, source: 'account_creation' },
        { userId: user.id, toggleName: 'R&D', isEnabled: false, source: 'account_creation' },
        { userId: user.id, toggleName: 'no_sell', isEnabled: true, source: 'account_creation' },
      ];
      
      await db.insert(userPrivacy).values(defaultPrivacySettings);
      
      console.log(`🔒 Created default privacy settings for new user ${user.id}:`, {
        portfolio: false,
        'R&D': false,
        no_sell: true
      });
    }
    
    return { 
      success: true, 
      user: {
        id: user.id,
        email: user.email || '',
        firstName: firstName,
        lastName: lastName,
        company: user.user_metadata?.company || null,
        verified: user.email_confirmed_at !== null,
        tosPpAccepted: dbUser.tosPpAccepted // Include ToS acceptance status
      }
    }
  } catch (error) {
    console.error('Token verification error:', error)
    return { success: false, error: 'Token verification failed' }
  }
}