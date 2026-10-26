// Copy this file to config.js and paste only Supabase PROJECT URL + PUBLISHABLE/ANON KEY.
// Publishable/anon keys are client-readable. RLS in sql/schema.sql MUST be enabled.
// NEVER paste a service_role key, AI provider secret, Toss server credentials or OAuth client secret here.
export const CONFIG={
  supabaseUrl:'',
  supabasePublishableKey:'',
  platform:'web', // 'web' or 'toss'. Toss requires a separate SDK/authentication integration before release.
  tossAppName:''
};
