# Tripkku 🌏  —  Travel planner

Travel planner PWA for friends. Live site: https://gayeon-hong.github.io/tripkku/

## Main functionality

- A/B itineraries and hotel/ryokan budget comparison.
- Shared and personal expense goal; overspend shown red; actual purchased airfare can be entered.
- Destination-centered globe with real NOAA/GSHHS coastlines and pin; character mood alternative.
- Day/night design and Korean/English UI.
- Trip-date forecast (Open-Meteo, available only within service forecast horizon).
- Supabase Google/Kakao auth and RLS protected friend collaboration *after configuring a project*.
- Gemini AI proposals via Edge Function only after server setup; local basic-command demo otherwise.

## Files

- `index.html`, `app.js`, `style.css`, `i18n.js`, `destination-map.js`, `world-coasts.js`, `earth-avatar.js` — PWA code.
- `config.js` — PUBLIC Supabase URL and PUBLISHABLE/ANON key only; never add secret keys.
- `assets/` — user-provided day/night logos, globe coastline assets.
- `sql/` and `supabase/` — backend definitions and optional AI function.
- `toss-miniapp/` — Apps in Toss SDK project (separate .ait build).
- `native-app/` — Capacitor starter, not prebuilt store binaries.

## Deployment

1. Follow `GITHUB_업데이트_방법.md` to upload through GitHub Desktop.
2. GitHub Pages: Settings → Pages → Deploy from branch → `main` → `/(root)`.
3. For database and login see `SUPABASE_연결_단계별_가이드.md`.
4. For stores and PWA see `APP_설치와_스토어_출시.md`.

## Production limitations

Current login, collaboration, and Gemini require a configured Supabase project. This repository is not a complete reviewed App Store/Play Store submission. Existing `.ait` bundles do not auto-update from GitHub. Verify actual transport/weather/venue data when traveling. Open-Meteo's free public API generally excludes commercial usage; arrange appropriate licensing or provider before monetization.

README is documentation in the GitHub repository; the public web user interface never links to or renders it.
