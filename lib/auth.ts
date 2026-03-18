import { supabase } from '@/lib/supabase';

// Utility to get current user
export const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
};
