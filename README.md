# Hustle Studio v4.1 — Production Desktop Prototype

A cinematic Vite + React control center for Hustle Studio with Firebase auth, Firestore, AWS Amplify telemetry, Workbox offline caching, and PWA install support. This build includes multi-theme support, a skippable intro gate, and resilient offline fallbacks with mock data.

## ✨ Highlights

- **Multi-theme engine** cycling between Noctis Gold, Verdant Olive, and Aurora Light with persistence to Firestore.
- **Cinematic intro gate** that plays once per device (F12 to open diagnostics overlay, Settings to toggle or upload custom intro media).
- **Offline-first UX** with Workbox caching, mock Firestore data, and an “Offline Mode Activated” banner when connectivity drops.
- **PWA ready**: manifest, icons, service worker, install prompt from the dashboard, and desktop-friendly caching headers.
- **Amplify monitor** dashboard for analytics previews plus keyboard shortcuts for productivity (Ctrl+E export reports, Ctrl+L login, Ctrl+R refresh).

## 🚀 Getting started

```bash
npm install
npm run seed   # optional demo data
npm run dev
```

The dev server runs at [http://localhost:3010](http://localhost:3010).

Demo credentials:

- `admin@studio.com` / `Admin123!`
- `staff@studio.com` / `Staff123!`

## 🖥️ Progressive Web App

| Feature | Status |
| ------- | ------ |
| Install prompt | Dashboard “Install App” button (triggered by `beforeinstallprompt`). |
| Service worker | `public/sw.js` using Workbox (network-first shell, stale assets, cached media). |
| Manifest | `public/manifest.webmanifest` with 192 & 512 icons. |
| Version file | `VERSION.txt` generated post-build with `v4.1`, timestamp, and git hash. |

Run `npm run build` to produce the production bundle. The postbuild hook generates `VERSION.txt` automatically.

## 🎨 Themes & Intro

- Theme palette and intro preferences are stored in `userSettings/{uid}` (with localStorage fallback).
- Use the navbar theme button to cycle looks; the active theme animates via CSS variables.
- Settings page lets you toggle “Show Intro on Startup” and upload custom intro video/audio (stored in Firebase Storage under `userAssets/{uid}/intro/`).
- The intro only plays once per device unless re-enabled in Settings.

## 🌐 Offline & Diagnostics

- Firestore reads are wrapped in `try/catch` with mock data located in `src/mockData/`.
- `useAuth` exposes `offlineMode`, surfaced through the in-app banner.
- Press **F12** to toggle the FPS & memory overlay.

## 🔍 Diagnostics tooling

Run the combined health check pipeline:

```bash
npm run diagnose
```

The command writes reports to `/reports/`:

- `lint.txt` — ESLint output
- `prettier.txt` — Prettier check
- `depcheck.txt` — dependency audit
- `bundle-analysis.json` — source-map-explorer output

## ✅ Final QA pipeline

Run the production audit bundle once you are ready to ship:

```bash
npm run qa
```

The script validates required environment keys, enforces the brand guard, optionally optimises any local assets, rebuilds with sourcemaps, and refreshes the deployment summary below. Set `HS_RUN_LIGHTHOUSE=true` before running to collect a Lighthouse report into `reports/lighthouse.json`.

## ☁️ Deploying

### Amplify

- `amplify.yml` injects Firebase secrets via Amplify Secrets Manager and caches dependencies.
- Custom headers cache static assets for one year while keeping `sw.js` and `index.html` un-cached.
- Run `amplify publish --invalidate-cloudfront` after `npm run build`.

### Firebase Hosting

- `firebase.json` rewrites all routes to `/index.html` for SPA support.
- Headers mirror the Amplify caching strategy (long-lived assets, no-cache for service worker and HTML).
- Deploy with `firebase deploy --only hosting`.

## 📁 Key directories

```
public/assets/        # Logos, icons, backgrounds, manifest
src/components/       # UI primitives (navbar, diagnostics overlay, intro gate)
src/theme/            # Theme context + definitions
src/mockData/         # Offline fallbacks for Firestore collections
scripts/              # Brand guard, diagnostics runner, version writer
```

## 🔐 Brand consistency guard

`npm run build` (and therefore CI) runs `scripts/BrandConsistencyGuard.js` before compiling. The guard fails the build if any banned terminology (legacy invitation content) sneaks back into the repo.

## 🚀 Deployment QA summary

<!-- QA_DEPLOYMENT_SUMMARY:START -->
**Commit:** 621b92f (dirty)
**Generated:** 2025-11-08T20:09:15.281Z
**Performance Score:** Pending
**Amplify Domain:** https://hustlestudio.co.za
**Firebase Backup:** https://side-hustle-studio.web.app

Environment validated, brand guard passed, and build artefacts generated with sourcemaps.
<!-- QA_DEPLOYMENT_SUMMARY:END -->

---

Happy building! Hustle Studio v4.1 is ready for desktop installs, offline field ops, and cinematic mission control demos.
