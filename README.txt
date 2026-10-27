Tripkku Day by Day time sort fix v4 (2026-10-27)
=================================================

Issue:
- plan_items are fetched by day_number, created_at.
- renderPlans() showed those items in insertion order, not start-time order.
- Example Day 02 rendered 16:30, 14:00, 08:30, 12:30.

Fix:
- Sort the items within each day by the START time before building HTML.
- Support common ranges (08:30-11:30, 10:00), approximate time labels
  (10:00 around), Korean AM/PM (오전 9시, 오후 3시 30분).
- Untimed entries like TBD/시간 미정 appear at the end, retaining their
  prior relative order.
- The "all itinerary" chatbot response uses the same chronological order.
- Existing app.js sidebar toggle and layout are otherwise unchanged.
- No SQL or Supabase schema change is required; no database rows are rewritten.

Install at GitHub project root (same directory as your current index.html):
  1. Replace app.js, index.html, and sw.js from this ZIP.
  2. Leave style.css, collab.js, AI functions and other files unchanged.
  3. Commit changes to GitHub and confirm GitHub Pages deployment.
  4. In Chrome press Ctrl+Shift+R. If still old, unregister the existing
     service worker under F12 > Application > Service Workers and reload.

Tests performed locally:
  - Node syntax check for app.js and sw.js.
  - Sort-helper tests with time ranges, Korean 12h notation, unknown time.
  - Browser DOM test at desktop and mobile widths, plus post-edit reordering.

Limitations:
  - This patch sorts display only; travel feasibility and estimated travel
    durations still require separate route optimization features.
  - Live Supabase, OAuth, and AI APIs have not been tested.
