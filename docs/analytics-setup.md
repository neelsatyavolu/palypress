# Analytics Setup

Implements the design in `docs/superpowers/specs/2026-05-28-analytics-design.md`.

## What's instrumented (in code)

| Event                             | Where it fires                                           | Key properties                                             |
| --------------------------------- | -------------------------------------------------------- | ---------------------------------------------------------- |
| `article_impression`              | Home/search article cards after becoming visible         | `article_id`, `title`, `publication`, `source`, `position` |
| `article_opened`                  | Article card taps, related article taps, deep links      | `article_id`, `title`, `publication`, `source`             |
| `article_viewed`                  | `ArticleDetailScreen` after 2s on screen                 | `article_id`, `title`, `publication`, `source`             |
| `article_engagement`              | Leaving an article detail screen                         | `duration_seconds`, `max_scroll_depth`, `completed`        |
| `article_read_completed`          | Article reaches read-depth and duration thresholds       | `duration_seconds`, `max_scroll_depth`                     |
| `account_created`                 | `AuthContext.signUpWithEmail` on success                 | `user_id`                                                  |
| `publication_selected`            | Publication switcher selection                           | `from_publication_id`, `to_publication_id`                 |
| `notification_permission_result`  | Push permission / token registration flow                | `status`, `platform`, `reason`                             |
| `notification_preference_updated` | Notification preference toggle succeeds                  | `publication_id`, `enabled`, `category_count`              |
| `notification_opened`             | User opens a push notification                           | `notification_id`, `article_id`, `publication_id`          |
| `ad_viewed`                       | **not wired yet** — call `trackAdViewed()` when ads ship | `ad_id`, `placement`                                       |
| identify / reset                  | `AuthContext` on login / logout                          | links anonymous history to account                         |

All helpers live in `client/lib/analytics.ts`. Analytics is a **no-op** when
both `EXPO_PUBLIC_POSTHOG_KEY` and `EXPO_PUBLIC_POSTHOG_API_KEY` are unset, so
local dev / Expo Go won't send events unless one of those vars is present.

## One-time setup (manual, by the team)

1. Create a free project at https://posthog.com (or self-host later).
2. Copy the **Project API Key** into `.env`:
   ```
   EXPO_PUBLIC_POSTHOG_KEY=phc_xxxxx
   EXPO_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com   # or eu / self-hosted
   ```
   The Expo PostHog connector may name the key `EXPO_PUBLIC_POSTHOG_API_KEY`;
   either name works. Add the same vars to your EAS build env (`eas secret:create`)
   and Railway if needed.
3. Rebuild the app (`expo run:ios` / `expo run:android`) so the env var is baked in.

## Reading the four metrics

| Metric              | Where                                                                                                                                                                |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Downloads**       | App Store Connect (iOS) + Google Play Console (Android). Not in PostHog — these are the only authoritative sources.                                                  |
| **Accounts**        | Source of truth: Postgres `users` table (`SELECT count(*)`). Trend over time: PostHog `account_created` insight.                                                     |
| **Article viewers** | PostHog → new Insight → events = `article_viewed`. Break down by `article_id` (or `title`) for per-article counts; change the date range for history / time windows. |
| **Article CTR**     | Compare `article_impression` to `article_opened`, broken down by `source`, `source_detail`, or `publication`.                                                |
| **Read quality**    | Use `article_engagement` and `article_read_completed` for read duration, scroll depth, and completion rate.                                                   |
| **Ad viewers**      | PostHog `ad_viewed` (empty until ads ship).                                                                                                                          |

### Suggested dashboard

Create one PostHog dashboard with insights for account growth, article CTR by
source, article completion rate, average read duration, top publications, push
notification opt-in rate, notification opens, `ad_viewed` once ads ship, and a
text tile linking to the app-store dashboards for downloads.

## When ads ship

Call from wherever the ad becomes visible:

```ts
import { trackAdViewed } from "@/lib/analytics";
trackAdViewed({ adId: ad.id, placement: "article_footer" });
```
