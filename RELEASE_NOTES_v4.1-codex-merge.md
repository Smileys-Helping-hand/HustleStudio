# Release Notes — v4.1 (codex merge)

Date: 2025-11-23
Tag: `v4.1-codex-merge`

Summary
- Merged two `codex/*` feature branches into `main`, bringing the CV generator and related automation features into the product.
- Fixed multiple runtime issues (manifest icons, TDZ exports) and added an `ErrorBoundary` to improve resilience.
- Added smoke-test tooling (Puppeteer) and an in-repo static server to run reproducible headless checks against `dist/`.
- Implemented performance improvements: manual chunking in `vite.config.js` and dynamic imports for heavy export libraries.

Notable Changes (files)
- `src/pages/CVGenerator.jsx`, `src/lib/cvGenerator.js` — CV generator and supporting logic (from `codex` branches).
- `src/pages/Reports.jsx` — export buttons now lazy-load heavy libs and show loading state while exporting.
- `src/pages/CRM/Invoices.jsx` — invoice PDF generation now lazy-loads `jspdf` and shows a generating state.
- `src/pages/Tools/components/CsvToWorkbook.jsx` — dynamic import of `exceljs` to reduce initial bundle.
- `src/lib/exportUtils.js` — jsPDF moved to dynamic import inside export function.
- `vite.config.js` — manual chunking reworked (per-package chunks + isolated big-libs).
- `public/manifest.webmanifest`, `public/index.html` — CDN icons replaced with local `public/assets/icons/*` to prevent external fetch failures in smoke tests.
- `scripts/smokeTest.mjs`, `scripts/serveAndSmoke.mjs` — puppeteer-based smoke-test tooling.

Build & Bundle Notes
- Production build: successful. Postbuild writes `VERSION.txt` with tag/commit info.
- Notable chunk sizes after minification (approx):
  - `chunk-exceljs` ≈ 939 KB (not gzipped)
  - `chunk-jspdf` ≈ 369 KB
  - `chunk-recharts` ≈ 288 KB
  - `chunk-html2canvas` ≈ 201 KB

Recommendations
- Consider server-side generation for heavy exports (Excel/PDF) to avoid shipping large client-side libs.
- If client-side exports must remain, evaluate lighter or tree-shaken builds (SheetJS trimmed builds, or custom Excel writer) to reduce `exceljs` size.
- Keep dynamic imports for other large features and add user-facing progress indicators where imports may take noticeable time.

Deployment / Notes
- Ensure required `VITE_` environment variables are provided for production builds; `scripts/validateEnv.mjs` enforces this during `npm run build`.
- Do NOT commit sensitive environment values into the repository. Use CI/CD secret stores for production deploys.
- Tag `v4.1-codex-merge` has been created and pushed.

If you'd like, I can:
- Create a GitHub Release using this tag and attach this file as release notes.
- Attempt a further bundle-size reduction (replace `exceljs` or implement server-side exports).

-- Hustle Studio — Release Bot
