# Side Hustle Studio v2

A Vite + React control center for the Side Hustle Studio team. This version includes Firebase authentication, Firestore data seeding, Tailwind UI polish, export utilities, and animated dashboards out of the box.

## Getting started

```bash
npm install
npm run seed # seeds Firebase Auth + Firestore using src/initAll.js
npm run dev   # launches the dev server on http://localhost:3010
```

Update your Firebase credentials by creating a `.env` file in the project root:

```bash
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

## Demo accounts

After running `npm run seed` the following demo accounts are available:

| Email               | Password   | Role  |
| ------------------- | ---------- | ----- |
| `admin@studio.com`  | `Admin123!` | Admin |
| `staff@studio.com`  | `Staff123!` | Staff |

## Available scripts

| Command         | Description                                                             |
| --------------- | ----------------------------------------------------------------------- |
| `npm run dev`   | Start the Vite development server.                                      |
| `npm run build` | Generate a production build in `dist/`.                                 |
| `npm run seed`  | Seed Firebase Auth & Firestore with demo data via `src/initAll.js`.     |
| `npm run setup` | Convenience command that runs `npm install` followed by the seed script |

## Tech stack

- [React](https://react.dev/) + [Vite](https://vitejs.dev/) for the frontend
- [Tailwind CSS](https://tailwindcss.com/) for styling
- [Firebase Auth](https://firebase.google.com/docs/auth) + [Firestore](https://firebase.google.com/docs/firestore)
- [Framer Motion](https://www.framer.com/motion/) for subtle animations
- [Recharts](https://recharts.org/), [ExcelJS](https://www.npmjs.com/package/exceljs), [FileSaver](https://www.npmjs.com/package/file-saver), and [jsPDF](https://github.com/parallax/jsPDF) for dashboards & exports
- [react-hot-toast](https://react-hot-toast.com/) for inline notifications

## Production preview

Create an optimized build and serve it locally:

```bash
npm run build
npm run preview
```

`npm run preview` serves the production build using Vite's preview server on port 4173 by default.

## Firebase Hosting deploy

Once you have the [Firebase CLI](https://firebase.google.com/docs/cli) installed and authenticated, deploy the latest
build to the configured `side-hustle-studio` project with:

```bash
firebase login           # one-time authentication step
npm run build            # emits static assets into dist/
firebase deploy --only hosting
```

The provided `firebase.json` rewrites every route to `index.html`, ensuring client-side routing continues to work when
served from Firebase Hosting.
