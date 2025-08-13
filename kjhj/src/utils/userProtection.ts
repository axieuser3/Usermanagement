import { supabase } from '../lib/supabase';

export interface UserProtectionStatus {
  isProtected: boolean;
  protectionReason: string;
  hasAccess: boolean;
  accessType: string;
}

/**
 * Verify if a user is protected from deletion
 * This function performs multiple safety checks
 */
export async function verifyUserProtection(userId: string): Promise<UserProtectionStatus> {
  try {
    const { data, error } = await supabase.rpc('verify_user_protection', { 
      p_user_id: userId 
    });

    if (error) {
      throw error;
    }

    const result = data?.[0];
    
    return {
      isProtected: result?.is_protected || false,
      protectionReason: result?.protection_reason || 'Unknown',
      hasAccess: result?.is_protected || false,
      accessType: result?.protection_reason || 'none'
    };
  } catch (error) {
    console.error('Error verifying user protection:', error);
    return {
      isProtected: false,
      protectionReason: 'Error checking protection status',
      hasAccess: false,
      accessType: 'error'
    };
  }
}

/**
 * Force sync subscription status for a user
 * Call this after subscription changes to ensure immediate protection
 */
export async function forceSyncUserStatus(userId: string): Promise<void> {
  try {
    // Run all protection functions
    await supabase.rpc('protect_paying_customers');
    await supabase.rpc('sync_subscription_status');
    
    console.log(`Successfully synced status for user: ${userId}`);
  } catch (error) {
    console.error('Error syncing user status:', error);
    throw error;
  }
}

/**
 * Check if user has any form of access to Axie Studio
 */
export async function checkUserAccess(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('get_user_access_level', { 
      p_user_id: userId 
    });

    if (error) {
      throw error;
    }

    return data?.[0]?.has_access || false;
  } catch (error) {
    console.error('Error checking user access:', error);
    return false;
  }
}