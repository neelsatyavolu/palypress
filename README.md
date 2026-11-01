# PALY Press

PALY Press is an iOS app for Palo Alto High School's student journalism. It pulls stories from 13 student publications (The Paly Voice, The Campanile, Verde Magazine, InFocus, C Magazine, Viking Sports Magazine and more) into one feed, alongside school tools like the bell schedule, calendar, and staff directory.

## Features

- **Unified feed** across all publications, with a publication switcher and per-publication feeds
- **Reader:** saved articles, upvotes, comments with reporting and blocking, and follows for publications
- **Archive search** of past Paly journalism
- **Notifications:** push alerts for new stories and a weekly email digest
- **School tools:** bell schedule, school calendar, classes, to-dos, staff directory and campus map
- **Accounts:** email and password (with verification and optional 2FA), Google Sign-In and Sign in with Apple

## Tech Stack

| Layer | Tools |
|-------|-------|
| App | Expo / React Native, React Navigation, TanStack Query, Tamagui |
| API | Express app running on Cloudflare Workers (`server/worker.ts`), Node entry for local dev (`server/index.ts`) |
| Database | Neon Postgres via Drizzle ORM (`shared/schema.ts`) |
| Content | The publications' WordPress REST APIs |
| Email | Resend |
| Analytics | PostHog |
| Comment relay | `wp-proxy/`, a small function deployed separately on Vercel |

## Getting Started

**Requirements:** Node.js 20 or newer, npm, and Xcode for the iOS simulator. Google and Apple sign-in use native modules, so they need a native build (`npm run ios`) rather than Expo Go.

1. Clone and install:
   ```bash
   git clone https://github.com/neelsatyavolu/palypress.git
   cd palypress
   npm install
   ```
2. Configure: copy `.env.example` to `.env` and fill in your own values. At minimum, the API needs `DATABASE_URL`, `SESSION_SECRET`, `ENCRYPTION_KEY` and `RESEND_API_KEY`. Never commit real secrets.
3. Create the database tables:
   ```bash
   npm run db:push
   ```
4. Start the API (on `localhost:5000`):
   ```bash
   npm run server:dev
   ```
5. In another terminal, start the app:
   ```bash
   npm run ios      # native build on the iOS simulator
   npm run expo     # Metro dev server only
   ```

In development, the app calls `localhost:5000` unless `EXPO_PUBLIC_DOMAIN` is set.

## Scripts

| Task | Command |
|------|---------|
| API (Node, local) | `npm run server:dev` |
| API (Worker, local) | `npm run worker:dev` (reads `.dev.vars`) |
| Deploy API | `npm run worker:deploy` |
| Push schema to DB | `npm run db:push` |
| Typecheck | `npm run check:types` |
| Lint | `npm run lint` |
| Format | `npm run format` |
| Apple auth tests | `npm run test:auth:apple` |
| One test file | `node --experimental-global-webcrypto --import tsx --test server/<name>.test.ts` |

Some server tests expect real service credentials (for example `RESEND_API_KEY`) and fail without them.

## Project Layout

| Path | Contents |
|------|----------|
| `client/` | The Expo app: screens, components, navigation, hooks |
| `server/` | API routes, auth, email, push notifications, weekly digest, archive search |
| `shared/` | Drizzle schema and types shared by the app and API |
| `migrations/` | SQL migrations |
| `wp-proxy/` | WordPress comment relay (Vercel) |
| `patches/` | `patch-package` fixes, applied on `npm install` |
| `docs/` | Setup notes for TestFlight, App Store and analytics, plus design specs |

## Deployment

- **API:** `npm run worker:deploy` runs the Apple auth tests, then deploys with Wrangler (see `wrangler.jsonc`). Set production secrets with `npx wrangler secret put <NAME>`.
- **iOS app:** built and submitted with EAS (see `eas.json` and `docs/app-store-testflight-setup.md`).

## Contributing

This repo is public. Read [`AGENTS.md`](AGENTS.md) before committing: it covers keeping secrets and personal data out of git.

## License

Licensed under the [Apache License, Version 2.0](LICENSE). See [NOTICE](NOTICE) for copyright details.
