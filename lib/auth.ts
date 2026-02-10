// Helper functions for Supabase Auth
import { createClient } from './supabase/server';

// Get current user from Supabase Auth
export async function getCurrentUser() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return user;
}
