# Hustle Studio v4.1 — Production Desktop Prototype

A cinematic Vite + React control center for Hustle Studio with Firebase auth, Firestore, AWS Amplify telemetry, Workbox offline caching, and PWA install support. This build includes multi-theme support, a skippable intro gate, and resilient offline fallbacks with mock data.

## ✨ Highlights

- **Multi-theme engine** cycling between Noctis Gold, Verdant Olive, and Aurora Light with persistence to Firestore.
- **Cinematic intro gate** that plays once per device (F12 to open diagnostics overlay, Settings to toggle or upload custom intro media).
- **Offline-first UX** with Workbox caching, mock Firestore data, and an “Offline Mode Activated” banner when connectivity drops.
- **PWA ready**: manifest, icons, service worker, install prompt from the dashboard, and desktop-friendly caching headers.
- **Amplify monitor** dashboard for analytics previews plus keyboard shortcuts for productivity (Ctrl+E export reports, Ctrl+L login, Ctrl+R refresh).
- **AI assistants** for strategy, finance, inventory, and general operations with credit metering and Stripe-ready top-ups.
- **Unified analytics suite** with live dashboards, notifications, and an optional SES-powered weekly digest summarised by GPT-4o-mini.

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

### Required environment variables

The AI features require an OpenAI key and optional Stripe configuration. Set the following in `.env` or your hosting provider:

```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_MEASUREMENT_ID=
VITE_BRAND_NAME="Hustle Studio"
VITE_CDN_DOMAIN=https://cdn.hustlestudio.co.za
VITE_OPENAI_API_KEY=
VITE_STRIPE_PUBLISHABLE_KEY=   # optional, required for checkout redirects
VITE_STRIPE_SECRET_KEY=        # optional, required for webhook scripts
VITE_PAYFAST_MERCHANT_ID=      # optional PayFast integration
VITE_PAYFAST_KEY=              # optional PayFast integration
VITE_PAYMENTS_ENDPOINT=        # optional server endpoint that creates Stripe/PayFast sessions
VITE_ANALYTICS_REFRESH_MS=30000
VITE_EMAIL_SERVICE_ID=         # optional EmailJS / automation id
VITE_EMAIL_TEMPLATE_ID=        # optional EmailJS template for digests
VITE_GOOGLE_SHEETS_API_KEY=    # optional, enables Google Sheets exports
VITE_TENANT_PLAN_DEFAULT=starter
VITE_BACKUP_BUCKET=            # optional storage bucket for nightly backups
STRIPE_WEBHOOK_SECRET=         # optional, required for stripeWebhook handler
VITE_BI_REPORTS_ENABLED=true   # toggle predictive BI console visibility
VITE_BI_REPORTS_CRON=monthly   # optional hint for scheduler integrations
```

Optional AWS SES keys for the weekly digest script:

```
AWS_SES_SOURCE=
AWS_SES_DESTINATION=admin@studio.com
AWS_SES_REGION=af-south-1
HS_DIGEST_USER_ID=            # optional override for analytics summary user
```

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

Generate an AI-authored weekly digest (uses OpenAI + SES/EmailJS when configured):

```
npm run weeklyDigest
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

## 🧭 Predictive Business Intelligence (V17)

- Toggle the admin console via `VITE_BI_REPORTS_ENABLED` (defaults to `true`). When enabled, navigate to **Admin → Intelligence → BI Reports** to produce GPT-authored summaries and forecasts on demand.
- Use `npm run reports:bi` (alias for `node scripts/generateBIReports.mjs`) to iterate through every tenant, create AI narratives, forecast the next month, and write downloadable PDFs to the local `reports/` directory.
- The orchestrator blends tenant metrics with anonymised global benchmarks sourced through the insights pipeline; supply richer numbers by storing aggregates in `tenants/{tenantId}/metrics`.

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
public/assets/        # (Ignored) restore locally from ../hustle_assets_backup when needed
src/components/       # UI primitives (navbar, diagnostics overlay, intro gate)
src/theme/            # Theme context + definitions
src/mockData/         # Offline fallbacks for Firestore collections
scripts/              # Brand guard, diagnostics runner, version writer, CDN helpers
```

The repository now resolves all images and media through `asset(path)` in `src/config/assets.js`. Run
`npm run upload:assets` after dropping refreshed files into `public/assets/` to sync them to the CDN.

## 🔐 Brand consistency guard

`npm run build` (and therefore CI) runs `scripts/BrandConsistencyGuard.js` before compiling. The guard fails the build if any banned terminology (legacy invitation content) sneaks back into the repo.

## 🚀 Deployment QA summary

<!-- QA_DEPLOYMENT_SUMMARY:START -->
**Commit:** de8c77c
**Generated:** 2025-11-09T13:50:46.939Z
**Performance Score:** Pending
**Amplify Domain:** https://hustlestudio.co.za
**Firebase Backup:** https://side-hustle-studio.web.app

Environment validated, brand guard passed, and build artefacts generated with sourcemaps.
<!-- QA_DEPLOYMENT_SUMMARY:END -->

---

Happy building! Hustle Studio v4.1 is ready for desktop installs, offline field ops, and cinematic mission control demos.
