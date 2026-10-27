Tripkku sidebar click fix v3 (2026-10-27)
========================================

Files to replace in the GitHub repository root:
  index.html
  app.js
  style.css
  sw.js

Keep your other files unchanged:
  collab.js, config.js, ai.js, trip-bookings.js, trip-reels.js,
  trip-studio.js, trip-recommend.js, Supabase SQL and Edge Functions.

Steps:
  1. Make a backup of the four existing files.
  2. Open GitHub / tripkku / Code / Add file / Upload files.
  3. Upload all four files into the repository root (not a nested folder).
  4. Commit changes; wait until Pages deployment is complete.
  5. Open the website and press Ctrl+Shift+R.
  6. Click the sidebar button two times; it should alternate
     between "Collapse" and "Expand".

If the old version remains:
  Chrome F12 > Application > Service Workers > Unregister;
  reload the page once. You do not need to clear site data.

Implementation:
  - Sidebar click is standalone inline script in index.html.
  - Removed duplicate sidebar click and state code in app.js.
  - CSS: desktop collapses to a 68px grid column; under 900px
    the sidebar becomes a top accordion without horizontal overflow.
  - Sidebar state saved to localStorage (same key as the prior version).
  - Updated service-worker cache version; resilient install if
    optional assets are missing.

Testing:
  - Static JS syntax checks for app.js and sw.js completed.
  - Chromium DOM/CSS interactive checks at widths 320,390,600,760,
    768,850,900,901,1024,1152,1366,1600px.
  - Repeated click and keyboard Enter/Space toggle tests passed.
  - No horizontal overflow in tested widths.
  - Real GitHub Pages, OAuth, Supabase DB and Gemini API not tested.

If GitHub has newer custom edits than the previous patch, merge
rather than overwriting unrelated changes.
