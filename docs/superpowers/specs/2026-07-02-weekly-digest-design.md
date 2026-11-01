# Weekly Digest Email

## Summary

A weekly email sent to users summarizing the top 5 most-upvoted articles
across all publications in the trailing 7 days. Opt-out (enabled by
default), sent Mondays 8am Pacific, built on the existing Resend email
shell in `server/email.ts`. Implements the design at
`guidelines/email-weekly-brief.card.html` in the PALY Press Design
System project.

## Data model

- `users.weeklyDigestEnabled: boolean` default `true`.
- New `weekly_digest_state` table: singleton row tracking `lastSentAt`
  so the scheduler survives restarts and never double-sends.

## Backend (`server/weeklyDigest.ts`)

- `storage.getTopUpvotedArticles(since, limit)`: groups `article_upvotes`
  by `(articleId, publicationId)` filtered to `createdAt >= since`,
  ordered by count desc, limit 5.
- `fetchArticleDetails(publication, articleId)`: WP REST
  `/posts/{id}?_embed` for title, excerpt, link, author name, featured
  image URL, category name. Read time estimated from `content.rendered`
  word count (~200 wpm).
- `buildWeeklyDigest()`: combines the above into the story list the
  template needs. Returns `null` if zero upvoted articles that week
  (digest is skipped, not sent empty).
- `runWeeklyDigestIfDue()`: compares `weekly_digest_state.lastSentAt`
  against the next Monday-8am-Pacific boundary; if due, builds the
  digest, fetches `users` where `weeklyDigestEnabled = true AND
  emailVerified = true`, sends via Resend, updates `lastSentAt`.
- `startWeeklyDigestScheduler()`: hourly `setInterval` check (same
  pattern as `startPushNotificationPoller`), runs immediately on boot
  to catch a missed window after a restart. Respects
  `DISABLE_WEEKLY_DIGEST_SCHEDULER=true`.

## Email template (`server/email.ts`)

`getWeeklyDigestEmailTemplate()` reuses the existing card shell (accent
bar, blue badge, 24px card, footer). Each story thumbnail renders the
article's WP featured image when present; falls back to the existing
publication-colored gradient + initials tile when not.
`sendWeeklyDigestEmail({ to, stories, weekRangeLabel, manageUrl })`
sends it via Resend.

## API (`server/routes.ts`)

`PATCH /api/user/weekly-digest` `{ enabled: boolean }`, session-authed,
updates `users.weeklyDigestEnabled`.

## Client

`NotificationSettingsScreen.tsx` gets a "Weekly digest email" row above
the publication list, using the same `Switch` pattern already on that
screen.

## Wiring

`server/index.ts` calls `startWeeklyDigestScheduler()` alongside the
existing `startPushNotificationPoller()`.

## Testing

- `getTopUpvotedArticles` grouping/date-filter logic.
- Digest-due-time calculation (Monday 8am Pacific boundary math).
- Email template rendering, following the existing
  `beta.test.ts`/`marketing.test.ts` pattern.
