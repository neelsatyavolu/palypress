<wizard-report>
# PostHog post-wizard report

The wizard has completed a deep integration of PostHog analytics into the PALY Press app (React Native / Expo). The integration builds on an existing foundation (`posthog-react-native` was already installed and a thin analytics wrapper existed) and extends it with a full event taxonomy, a PostHog provider for autocapture, and a PostHog dashboard with five insights.

**Summary of changes:**

- **`.env`** — Set `EXPO_PUBLIC_POSTHOG_KEY` to the project token and `EXPO_PUBLIC_POSTHOG_HOST` to `https://us.i.posthog.com`.
- **`client/App.tsx`** — Wrapped the provider tree with `PostHogProvider` (using the existing standalone client), enabling autocapture of touch events and the `usePostHog()` hook throughout the app.
- **`client/lib/analytics.ts`** — Added seven new typed event helper functions: `trackSignedIn`, `trackSignedOut`, `trackArticleSaved`, `trackArticleUnsaved`, `trackCommentSubmitted`, `trackSearchPerformed`, and `trackProfileUpdated`.
- **`client/contexts/AuthContext.tsx`** — Called `trackSignedIn` (with `auth_method`) on successful Google and email sign-ins; called `trackSignedOut` before the PostHog session reset on sign-out.
- **`client/screens/ArticleDetailScreen.tsx`** — Called `trackArticleSaved` / `trackArticleUnsaved` in the save/unsave handler.
- **`client/components/CommentsSection.tsx`** — Called `trackCommentSubmitted` (with `is_reply` flag) in the post-comment callback.
- **`client/screens/SearchScreen.tsx`** — Called `trackSearchPerformed` (with `result_count`) after a debounced search returns page-1 results.
- **`client/screens/ProfileScreen.tsx`** — Called `trackProfileUpdated` after a successful display-name save.

## Event table

| Event | Description | File |
|---|---|---|
| `account_created` | New user account created | `client/contexts/AuthContext.tsx` |
| `article_viewed` | Article read for ≥ 2 seconds | `client/screens/ArticleDetailScreen.tsx` |
| `user_signed_in` | Successful sign-in (Google or email) | `client/contexts/AuthContext.tsx` |
| `user_signed_out` | User explicitly signed out | `client/contexts/AuthContext.tsx` |
| `article_saved` | Article bookmarked for later | `client/screens/ArticleDetailScreen.tsx` |
| `article_unsaved` | Article bookmark removed | `client/screens/ArticleDetailScreen.tsx` |
| `comment_submitted` | Comment or reply posted on an article | `client/components/CommentsSection.tsx` |
| `search_performed` | Debounced search query executed | `client/screens/SearchScreen.tsx` |
| `profile_updated` | Display name updated successfully | `client/screens/ProfileScreen.tsx` |

## Next steps

We've built some insights and a dashboard for you to keep an eye on user behavior, based on the events we just instrumented:

- [Analytics basics dashboard](/dashboard/1643594)
- [Article Views Over Time](/insights/XwyBmTyV)
- [Sign-ins by Auth Method](/insights/djAYhi9D)
- [Article Save Rate](/insights/o6GI0GP8)
- [New Account Signups](/insights/g1Bo4ksy)
- [Comment & Search Activity](/insights/TnTMV8m6)

### Agent skill

We've left an agent skill folder in your project at `.claude/skills/integration-expo/`. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.

</wizard-report>
