// Copy this file to config.js and paste only Supabase PROJECT URL + PUBLISHABLE/ANON KEY.
// Publishable/anon keys are client-readable. RLS in sql/schema.sql MUST be enabled.
// NEVER paste a service_role key, AI provider secret, Toss server credentials or OAuth client secret here.
export const CONFIG={
  supabaseUrl:eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFhY2h2YmJibHd5Y3V0Z2d6ZHBwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI5OTA4NzMsImV4cCI6MjEwODU2Njg3M30.Hfx5-hMP7B8yfO9aFCsj9r6pKi_Bm2fKo4PWfvOd4kA,
  supabasePublishableKey:eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFhY2h2YmJibHd5Y3V0Z2d6ZHBwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI5OTA4NzMsImV4cCI6MjEwODU2Njg3M30.Hfx5-hMP7B8yfO9aFCsj9r6pKi_Bm2fKo4PWfvOd4kA,
  platform:'web', // 'web' or 'toss'. Toss requires a separate SDK/authentication integration before release.
  tossAppName:''
};
