Tripkku AI chat fix (2026-10-26)

1. Backup current app.js and ai.js. Replace these two files at project root, commit and push to GitHub Pages.
2. Redeploy supabase/functions/trip-ai/index.ts via Supabase Edge Functions > trip-ai > Code > Deploy updates.
3. Keep GEMINI_API_KEY in Supabase Secrets. No changes to database or RLS are needed for this patch.
4. Login, open a saved trip, ask: 2일차 점심 이후 이자카야 추가해줘. Gemini should return a proposal and the site will ask for confirmation.
5. If it still asks repeatedly, check Supabase Edge Function logs and confirm the deployed code is the updated file.

This is a source-level patch, NOT production-tested. Test with a spare trip first. It does not change server-side approval security; existing RLS applies.
