# EasyShift

EasyShift is a cross-platform staff scheduling and attendance application combining a Next.js web frontend with Capacitor-powered mobile wrappers (Android & iOS), Supabase for backend data/auth, and a small Python service for auxiliary features (AI/processing). It bundles staff management, QR-based attendance, multilingual support, and mobile-ready flows designed for shift and attendance scenarios.

--

## Key Features

- Staff management (signup, login, dashboard)
- QR code-based attendance (scanner + verification)
- Shift scheduling and owner/admin dashboards
- Multilingual UI (i18n support for en, es, hi, mr)
- Mobile-ready using Capacitor (Android and iOS folders included)
- Supabase utilities and SQL scripts for quick DB setup
- Local Python AI/service utilities in `python/` for server-side tasks

## Tech stack

- Frontend: Next.js (app router) + React
- Mobile container: Capacitor (Android & iOS projects included)
- Backend / Database: Supabase (Postgres) — SQL setup scripts included
- Auxiliary services: Python (scripts in `python/`) — optional AI/server components
- Other: Tailwind/PostCSS (postcss.config.mjs present), i18next-style translation files in `public/locales`

## Quick Install (Development)

Prerequisites:
- Node.js (16+ recommended)
- npm or pnpm
- Python 3.8+ (if using Python services)
- Android Studio / Xcode for mobile builds (only if building native apps)

1. Clone the repository

```powershell
git clone <your-repo-url>
cd EasyShift
```

2. Install Node dependencies

```powershell
npm install
```

3. Add environment variables

Create a `.env.local` at the project root and add (example keys):

```
NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-supabase-anon-key>
```

4. Initialize Supabase schema (optional/dev)

Use the provided SQL files to create tables and seed basic schema in your Supabase project:

- `supabase-attendance-setup.sql`
- `supabase-staff-table-setup.sql`

Run them from the Supabase SQL editor or psql against your database.

5. Run the Next.js development server

```powershell
npm run dev
# open http://localhost:3000
```

6. (Optional) Run Python services

The `python/` folder contains helper scripts. To start the simple server (if required):

```powershell
cd python
python start_server.py
```

## Building & Running Mobile (Capacitor)

1. Build the web app

```powershell
npm run build
```

2. Sync to native projects

```powershell
npx cap sync
npx cap open android
# or
npx cap open ios
```

3. Use Android Studio or Xcode to run on device/emulator.

Note: Make sure the native SDKs and environment variables are configured for Android/iOS builds.

## Usage examples

- Developer mode (web): `npm run dev`
- Production build (web): `npm run build` then `npm run start` (if applicable)
- Open Android project: `npx cap open android`
- Run Python helper: `python python/start_server.py`

Example: start web dev server, then run python helper

```powershell
npm run dev; cd python; python start_server.py
```

## Folder structure (important files)

Top-level overview (trimmed):

- `app/` — Next.js app routes and UI (see `src/app` in this repo)
- `components/` — Reusable React components (UI helpers)
- `public/locales/` — Translation JSON files (en, es, hi, mr)
- `android/`, `ios/` — Capacitor native projects for mobile builds
- `python/` — Python scripts and small services (AI/server helpers)
- `src/app/` — Application entry (pages, layouts, dash views, staff flows)
- `resources/`, `public/` — static assets and images
- `supabase-*.sql` — SQL scripts for DB schema and setup
- `start_ai_server.bat`, `run.txt` — helper run scripts for Windows

Example (short tree):

```
.
├─ android/
├─ ios/
├─ components/
├─ public/locales/
├─ python/
├─ src/app/
└─ supabase-attendance-setup.sql
```


## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.js`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
