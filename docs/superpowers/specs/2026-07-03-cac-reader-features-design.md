# PALY Press — Reader Experience Features (Design Spec)

**Date:** 2026-07-03
**Status:** Approved design, ready for implementation planning
**Context:** Four features to strengthen the app for the Congressional App Challenge — targeting the CAC rubric's *Concept* (relevant community problem) and *Technology* (complex, well-explained features) scores.

## Scope

Build four features, in this order:

1. **Follow Publications** — server-backed, syncs across devices
2. **Civic / Local Lens** — curated category mapping **+** keyword matching
3. **Offline Reading** — saved articles + the ~15 newest feed articles
4. **Accessibility** — "Listen to article" (TTS) + a full accessibility pass

**Out of scope (deferred):** Schoology / bell-schedule / campus-map features; reader engagement loop (tips/letters); server-side sync of offline cache; LLM-based civic classification.

## Existing architecture (what we build on)

- **Client:** Expo / React Native, path alias `@/` → `client/`. Context providers for Auth, Publication, Notification, ReaderPreferences, SavedArticles, Theme, Upvote.
- **Feed:** `client/hooks/useUnifiedFeed.ts` fetches client-side from each publication's WordPress `apiBaseUrl` (`/posts?_embed`, 3 per publication), merges, and ranks via `client/lib/ranking.ts`. External (SoundCloud/Issuu) feeds are proxied through `GET /api/publications/:id/feed`. **Feed articles already include `content.rendered`.**
- **Categories:** `client/hooks/useUnifiedCategories.ts` maps categories across publications (`publicationMappings` → `categoryId`). Home renders `CategoryTabs`.
- **Server:** Express + Drizzle + Postgres (Railway). Routes in `server/routes.ts`, data access in `server/storage.ts`, schema + Zod in `shared/schema.ts`. Saved articles (`saved_articles`) and per-publication notification prefs (`notification_preferences`) are the closest existing patterns to mirror.
- **Storage primitives:** `@react-native-async-storage/async-storage` (installed), `expo-file-system` ~19 (installed).
- **New dependencies required:** `expo-speech` (TTS), `@react-native-community/netinfo` (reactive connectivity). Both are native modules; the app already ships native modules and runs on a dev/EAS build, so this is acceptable. Register `expo-speech` in `app.json` plugins if required by the module.

---

## Feature 1 — Follow Publications

Let readers follow specific publications and get a personalized "For You" feed. Server-backed so follows sync across devices; requires sign-in.

### Data model (`shared/schema.ts`)
```
publication_follows
  userId       varchar  FK users.id ON DELETE CASCADE
  publicationId varchar(50)
  createdAt    timestamp default now
  PK (userId, publicationId)
  index (userId)
```
Add `insertFollowSchema` (Zod: `{ publicationId: string }`) and exported `PublicationFollow` type. Add a Drizzle migration under `migrations/`.

### Server (`server/routes.ts`, `server/storage.ts`)
- `GET  /api/follows` → `{ publicationIds: string[] }` (auth required)
- `POST /api/follows` `{ publicationId }` → validates against known publication IDs; upsert (idempotent)
- `DELETE /api/follows/:publicationId`
- `storage.getFollows(userId)`, `storage.addFollow(userId, publicationId)`, `storage.removeFollow(userId, publicationId)`
- Validate `publicationId` is a real publication (reject unknown IDs). Reuse `requireAuth`.

### Client
- **`client/contexts/FollowsContext.tsx`** — mirrors `SavedArticlesContext`: exposes `followedPublicationIds: Set<string>`, `followPublication(id)`, `unfollowPublication(id)`, `isFollowing(id)`, `refreshFollows()`. Empty when unauthenticated. Register the provider alongside the others in the app root.
- **Follow toggle UI** — a one-tap Follow/Following control on the publication switcher/publication header (wherever a publication is presented). Uses `accessibilityLabel` / `accessibilityState={{ selected }}`.
- **"For You" feed** — extend `useUnifiedFeed` with an optional `publicationIds?: string[]` that restricts which publications are fetched/merged (default: all `FEED_PUBLICATIONS`). Add a **"For You"** entry to Home's `CategoryTabs` (or a For-You/All segmented toggle). When selected and the user follows ≥1 publication, pass `followedPublicationIds`; otherwise fall back to the full feed and show a lightweight "Follow publications to personalize" prompt.

### Edge cases
- Unauthenticated user selects "For You" → prompt to sign in, fall back to all-pubs feed (never dead-end).
- User follows 0 publications → For You shows all + prompt.
- Following an external-only publication (KPLY/proof/viaverde) is allowed; feed logic already handles those via the proxy route.

### Tests
- Server: follow/unfollow/list happy path, auth rejection, unknown publication rejection, idempotent double-follow.
- Client: `FollowsContext` state transitions; `useUnifiedFeed` respects `publicationIds`.

---

## Feature 2 — Civic / Local Lens

A dedicated lens surfacing civic/local coverage across all publications, framed as civic-literacy tooling.

### Classification (`client/constants/civic.ts`)
- `CIVIC_CATEGORY_MAP: Record<publicationId, string[]>` — civic-related WordPress category slugs per publication (e.g. news, government, elections, community).
- `CIVIC_KEYWORDS: string[]` — lowercased terms (election, ballot, board, council, policy, measure, city, district, vote, legislation, mayor, referendum…).
- An article **qualifies** if: any of its `_embedded["wp:term"]` category slugs is in that publication's `CIVIC_CATEGORY_MAP`, **OR** its title/excerpt (HTML-stripped, lowercased) contains any `CIVIC_KEYWORDS` entry.
- `isCivicArticle(article: ArticleWithSource): boolean` implements the rule (pure, unit-testable).

### Feed (`client/hooks/useCivicFeed.ts`)
- Wraps the unified feed fetch, applies `isCivicArticle`, returns filtered + ranked results with the same loading/pagination contract as `useUnifiedFeed`. To keep enough civic results per page it may request a larger `per_page` from the underlying fetch before filtering.

### UI
- **Dedicated `CivicTab`** in `client/navigation/MainTabNavigator.tsx` (tab room exists: News, Calendar, Settings are visible). New `CivicStackNavigator` → `CivicScreen`.
- **`client/screens/CivicScreen.tsx`** — renders the civic feed using existing `ArticleCard` components, with a header explaining the section's purpose.
- **"Why this matters" context cards** — `client/constants/civicContext.ts` holds a small curated set of static, non-partisan explainer cards (what the school board / city council does, how to attend a meeting, key civic dates). Rendered above/within the civic feed. Content is informational only — no endorsements.

### Edge cases
- No civic articles found → `EmptyState` with explanation, still show context cards.
- Keyword false positives are acceptable at low volume; category mapping is the primary signal. Keep `CIVIC_KEYWORDS` conservative.

### Tests
- `isCivicArticle`: matches by category, matches by keyword, rejects non-civic, handles missing `_embedded`/empty excerpt.

---

## Feature 3 — Offline Reading

Saved articles and the ~15 newest feed articles are readable without a connection.

### Store (`client/lib/offlineStore.ts`)
- Article bodies persisted as JSON via `expo-file-system` (one file per article under a dedicated `offline/` directory); a lightweight **index** (id → {title, publicationId, savedReason, cachedAt}) kept in AsyncStorage.
- API: `cacheArticle(article, reason: "saved" | "recent")`, `getCachedArticle(id)`, `getCachedArticleIds()`, `removeCachedArticle(id)`, `pruneRecent(max = 15)` (LRU by `cachedAt`, only prunes `reason: "recent"` — never evicts saved).
- `reason` lets a saved article that was also "recent" survive pruning.

### Triggers
- **Saved:** hook into `SavedArticlesContext.saveArticle` success → `cacheArticle(article, "saved")`; `unsaveArticle` → `removeCachedArticle(id)`. (Requires the full article object at save time; ensure the Save call sites pass content — feed/detail already have it.)
- **Recent:** after Home's unified feed loads, `cacheArticle(top ~15, "recent")` then `pruneRecent(15)`.

### Connectivity + read path
- **`client/hooks/useConnectivity.ts`** wraps `netinfo`'s `useNetInfo()` → `{ isOffline }`.
- **Offline banner** — a small persistent banner (e.g. in the app shell / Home header) when `isOffline`.
- **"Available offline" badge** on cached articles in lists and detail.
- **Read fallback:** `ArticleDetailScreen` and Home read from `offlineStore` when offline (or when a live fetch fails), falling back to cached content and showing the offline state. When online, behavior is unchanged.

### Edge cases
- Cache miss while offline → clear "Not available offline" message, not a spinner.
- File-system write failure → log, do not block the save (saving to the server still succeeds).
- Storage bounded: saved (user-controlled) + ≤15 recent.

### Tests
- `offlineStore`: cache→get round-trip, `pruneRecent` keeps saved + newest 15, remove.
- `useConnectivity`: online/offline transitions (mock netinfo).

---

## Feature 4 — Accessibility

### Listen to article (TTS)
- Add `expo-speech`.
- **`client/hooks/useArticleSpeech.ts`** — `speak(htmlOrText)`, `pause()`, `resume()`, `stop()`, plus `status: "idle" | "playing" | "paused"`. Strips HTML to plain text (reuse existing HTML-stripping util if present, else add one). Cleans up on unmount / article change.
- **▶ Listen control** in `ArticleDetailScreen` header — play/pause/stop, fully labeled for screen readers, respects the "playing" state visually.

### Accessibility pass
- **Labels/roles:** add `accessibilityLabel`, `accessibilityRole`, and `accessibilityHint` to interactive elements — `ArticleCard`/`ArticleCardFeatured`, tab bar items, and the new Follow/Save/Listen buttons. Article cards announce title + publication + "article".
- **Reduce motion:** **`client/hooks/useReduceMotion.ts`** wraps `AccessibilityInfo.isReduceMotionEnabled()` + change subscription. Gate Reanimated entrance animations (`FadeInUp`, `LinearTransition`, etc.) so they're skipped/instant when reduce-motion is on.
- **Touch targets:** add `hitSlop` to icon-only buttons so tap targets are ≥44×44.
- **Dynamic Type:** ensure `ThemedText` and key UI text do not disable `allowFontScaling`; set sensible `maxFontSizeMultiplier` where layouts would otherwise break. Verify large-text layouts on the new screens.

### Tests
- `useArticleSpeech`: state transitions (idle→playing→paused→idle), HTML stripping.
- `useReduceMotion`: reflects initial value + updates on change event (mock `AccessibilityInfo`).

---

## Cross-cutting

- **Immutability & style:** follow existing context/hook patterns; new files stay focused (<400 lines). Match existing formatting.
- **Providers:** register `FollowsContext` in the same root where the other providers are composed.
- **Error handling:** user-facing failures degrade gracefully (never dead-end a feed); log details.
- **Testing:** unit tests colocated as `*.test.ts` next to sources, matching the repo's existing convention. Target the pure logic (`isCivicArticle`, `offlineStore`, hooks) first.

## Dependencies to add
- `expo-speech`
- `@react-native-community/netinfo`

## Sequencing (each independently shippable/demoable)
1. Follow Publications
2. Civic / Local Lens
3. Offline Reading
4. Accessibility (TTS + a11y pass)
