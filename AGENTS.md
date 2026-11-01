# Agent Instructions

## THIS REPO IS PUBLIC
- `github.com/neelsatyavolu/palypress` is public. Every commit, branch, issue, PR and commit message is world-readable and stays cached after deletion.
- Never commit secrets: `.env*` (except `.env.example`), `.dev.vars`, `.eas-credentials/`, `credentials.json`, `*.p8`, `*.pem`, database URLs, API keys, passwords, tokens.
- Server secrets go in `wrangler secret put <NAME>`; local values go in `.dev.vars` / `.env` (both gitignored). New variables get a placeholder in `.env.example`.
- Never commit personal data: real user or student records, database dumps, logs, HAR captures, support correspondence, Apple case numbers, or screenshots showing real accounts.
- Never commit machine-specific files: absolute `/Users/...` paths, `.agmux/`, `.claude/`, `.grok/`, `.agents/`, `*.local.md`.
- Stage files by name; review `git diff --staged` before every commit.
- Run `gitleaks git --staged` before committing; fix every finding.
- If a secret is ever pushed: rotate it at the provider immediately. Deleting the commit does not unleak it.
- Never push `private-main`, other pre-2026-11-01 branches, or the `private` / `private-upstream` remotes to `origin`: that history contains live secrets. The local pre-push hook blocks it; do not bypass it with `--no-verify`.

## Local Notes
- If `AGENTS.local.md` exists, read it too (untracked, machine-specific rules).

## Package Manager
- Use **npm**: `npm install` (runs `patch-package` via `postinstall`; patches in `patches/`).

## Commands
| Task | Command |
|------|---------|
| Test file | `node --experimental-global-webcrypto --import tsx --test server/<name>.test.ts` |
| Apple auth tests | `npm run test:auth:apple` |
| Typecheck | `npm run check:types` |
| Lint | `npm run lint` |
| App (Expo) | `npm run expo` |
| API locally (Worker) | `npm run worker:dev` |
| Deploy API | `npm run worker:deploy` |
| DB schema push | `npm run db:push` |

## Layout
| Path | Contents |
|------|----------|
| `client/` | Expo / React Native app |
| `server/` | API; `server/worker.ts` is the Cloudflare Worker entry (`wrangler.jsonc`) |
| `shared/schema.ts` | Drizzle schema (Neon Postgres) |
| `migrations/` | SQL migrations |
| `wp-proxy/` | WordPress comment relay, deployed separately on Vercel |

## External References
| Need | File |
|------|------|
| Setup & env vars | `README.md`, `.env.example` |
| TestFlight / App Store | `docs/app-store-testflight-setup.md` |
| Analytics | `docs/analytics-setup.md` |
