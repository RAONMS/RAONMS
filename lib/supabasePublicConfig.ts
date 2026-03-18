const FALLBACK_SUPABASE_URL = 'https://yozbdrfewcixikadngwv.supabase.co';
const FALLBACK_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlvemJkcmZld2NpeGlrYWRuZ3d2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyNjU3OTMsImV4cCI6MjA4ODg0MTc5M30.PRfPPyG4YHg81ZiJzhtvHx8BLwVAruQDFmQNACzTJBc';

export function getSupabasePublicConfig() {
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || FALLBACK_SUPABASE_URL,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || FALLBACK_SUPABASE_ANON_KEY,
  };
}

export function getSupabasePublicConfigStatus() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  return {
    hasEnvUrl: !!url,
    hasEnvAnonKey: !!anonKey,
    usingFallbackUrl: !url,
    usingFallbackAnonKey: !anonKey,
  };
}
