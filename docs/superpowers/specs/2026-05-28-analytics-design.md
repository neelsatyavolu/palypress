# Analytics Design — paly_journalism_app

**Date:** 2026-05-28
**Status:** Approved (brainstorming) — pending implementation plan

## Goal

Give the dev team visibility into four metrics:

1. Number of downloads
2. Number of accounts
3. Number of viewers per article (historical, time-windowed)
4. Number of viewers per ad

## Decisions

| Decision | Choice | Rationale |
|---|---|---|
| In-app analytics tool | **PostHog** (hosted cloud, free tier) | React Native SDK, trends/insights/dashboards out of the box, can self-host later |
| Viewer scope | **Everyone** (anonymous + identified on login) | Article views should reflect all readers, not just logged-in users |
| Real-time vs windowed | **Time-windowed totals only** | No concurrent-presence system needed; covers "history" too |
| Ads | **Designed now, wired when ads ship** | No ad system exists in the schema yet |
| Consumption surface | **PostHog dashboard** | "Devs can figure it out" — no custom in-app UI |
| Article view trigger | **2s dwell threshold** | Filters accidental taps |

## The four metrics, by source

| Metric | Source | Mechanism |
|---|---|---|
| Downloads | App Store Connect + Play Console | Read vendor dashboards — NOT instrumented in code. Cannot be tracked in-app. |
| Accounts | Postgres `users` table | `SELECT count(*)`; also mirror to PostHog via `account_created` event for trend view |
| Article viewers | PostHog | `article_viewed` event, time-windowed trends + per-article breakdown |
| Ad viewers | PostHog | `ad_viewed` event — stubbed now, fired when ads ship |

## Architecture

### 1. SDK setup
- Add `posthog-react-native` to the Expo client.
- Initialize once at the app root with the PostHog project API key.
- API key stored as an Expo public env var (`EXPO_PUBLIC_POSTHOG_KEY`) + host (`EXPO_PUBLIC_POSTHOG_HOST`). **Not hardcoded.**

### 2. Identity
- SDK auto-generates an anonymous device ID → not-logged-in readers are counted.
- On successful login, call `posthog.identify(userId)` to stitch anonymous history to the account.
- On logout, call `posthog.reset()`.
- Enables both "anyone" totals and per-account segmentation.

### 3. Custom events
| Event | Properties | Fired when |
|---|---|---|
| `article_viewed` | `article_id`, `title`, `publication` | Article screen has been open for ≥ 2 seconds |
| `ad_viewed` | `ad_id`, `placement` | Ad becomes visible (stub for now) |
| `account_created` | `user_id` | On successful signup (mirrors Postgres count into PostHog) |

### 4. Article identity (open detail to verify)
- Articles come from external publication feeds, not the local DB.
- Need a **stable `article_id`** (feed's existing unique ID — e.g. WordPress post ID / GUID).
- **Action before implementation:** confirm what stable identifier the publication feed exposes (`shared/publications.ts`).

### 5. Dashboard
One PostHog dashboard with four insights:
- Accounts over time (from `account_created`)
- Article views — trend + per-article breakdown table
- Ad views (empty until ads ship)
- A note/link pointing to App Store Connect + Play Console for downloads

## Out of scope (YAGNI)

- Real-time concurrent-viewer presence (websockets/heartbeats) — chose time-windowed.
- Custom admin/dev screen in the app — PostHog dashboard suffices.
- Self-hosted event tables in Postgres — PostHog owns events; Postgres remains source of truth for accounts only.
- Building the ad rendering system — only the tracking event is defined here.

## Open items to resolve during planning

1. Confirm stable `article_id` from the publication feed.
2. Confirm where login/logout happens in the client to place `identify` / `reset`.
3. Confirm signup flow location for `account_created`.
4. PostHog account creation + obtaining project API key (manual, by the team).
