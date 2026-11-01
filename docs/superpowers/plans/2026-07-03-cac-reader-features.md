# CAC Reader Features Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Follow Publications, a Civic/Local lens, offline reading, and accessibility (TTS + a11y pass) to PALY Press for the Congressional App Challenge.

**Architecture:** Follows are server-backed (Postgres/Drizzle) mirroring the saved-articles pattern; the personalized "For You" feed reuses the existing client-side `useUnifiedFeed` with a publication filter. The Civic lens is a curated-category + keyword filter over the same unified feed, surfaced as a dedicated tab. Offline reading persists article bodies via `expo-file-system` with an AsyncStorage index, triggered on save and on feed load. Accessibility adds `expo-speech` TTS plus screen-reader labels, reduce-motion gating, and touch-target fixes.

**Tech Stack:** Expo/React Native (path alias `@/` → `client/`), Express + Drizzle + PostgreSQL, AsyncStorage, `expo-file-system`, new deps `expo-speech` and `@react-native-community/netinfo`. Tests use the repo's existing Jest setup (`*.test.ts` colocated with sources).

## Global Constraints

- Path alias `@/` maps to `client/`. Server code lives in `server/`, shared schema/types in `shared/`.
- Immutability: never mutate objects/state in place; return new copies (repo rule).
- Files stay focused: 200–400 lines typical, 800 max. Extract when a file grows.
- New client contexts must be registered in the app root where the other providers (`AuthProvider`, `SavedArticlesProvider`, etc.) are composed.
- Server routes requiring a user use the existing `requireAuth` middleware and `(req.session as any).userId`.
- Validate all input at the boundary with Zod; reject unknown publication IDs.
- **Testing convention (BINDING — overrides any `describe`/`it`/`expect`/`jest`/`renderHook`/`@testing-library` code shown illustratively in tasks below):** This repo has **no Jest/Vitest and no `npm test`**. All tests use `import assert from "node:assert/strict"`, import the real module with **relative paths (never the `@/` alias)**, run assertions at top level (or in small plain functions), and are executed with `npx tsx <path/to/file.test.ts>` (exits non-zero on failure). Test blocks in tasks below show *what behavior to assert* — translate them to `node:assert` style. Only unit-test **pure, RN-free logic**; do not write tests that import React Native, `expo-*`, or native modules (they can't run under `tsx` in Node). To keep a helper testable, place it in a module that does **not** import RN/native at module scope.
- **Pure-helper placement:** `deriveIsOffline`, `htmlToSpeechText`, `selectPruneVictims`, `isCivicArticle`, `selectFeedPublicationIds`, `isFollowingHelper` must live where a test can `tsx`-import them without pulling in RN/native. If the hosting hook/module imports a native package at top scope, extract the pure helper into a sibling RN-free file (e.g. `client/lib/offlinePrune.ts`) and have both the hook and the test import it.
- Type-check with `npm run check:types`. Lint with `npm run lint`. Format check with `npm run check:format`.
- **Migrations are generated, NOT pushed.** Use `npx drizzle-kit generate` to produce SQL under `migrations/` and commit it. Do **not** run `db:push` — the user applies migrations to the production Railway DB themselves.
- Publication ID validation: `shared/publications.ts` exports `isValidPublicationId(id)` and `PUBLICATION_CONFIGS`. Note it lists only the 9 WordPress publications (no external `kply`/`proof`/`viaverde`). The client `client/constants/publications.ts` has the full list (`FEED_PUBLICATIONS` includes external). Follows should accept any real publication ID — validate against the full client list of IDs, not only `isValidPublicationId`. Publication `id`s: `palyvoice`, `infocus`, `campanile`, `verde`, `cmag`, `viking`, `anthro`, `archive`, `ink`, `veritas`, `viaverde`, `kply`, `proof`.
- App-root provider composition lives in `client/App.tsx` (wraps `SavedArticlesProvider`, etc.).

---

## Phase 1 — Follow Publications

Server-backed follows + a "For You" personalized feed.

### Task 1.1: `publication_follows` schema + migration

**Files:**
- Modify: `shared/schema.ts` (append new table near `savedArticles`)
- Create: `migrations/` new SQL file (via `npm run db:push` or drizzle-kit generate)

**Interfaces:**
- Produces: `publicationFollows` table, `insertFollowSchema` Zod (`{ publicationId: string }`), type `PublicationFollow`.

- [ ] **Step 1: Add the table and schema to `shared/schema.ts`**

Append (mirroring the existing `savedArticles` definition and imports already in the file):

```ts
export const publicationFollows = pgTable(
  "publication_follows",
  {
    userId: varchar("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    publicationId: varchar("publication_id", { length: 50 }).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.publicationId] }),
    userIdx: index("idx_follows_user").on(table.userId),
  }),
);

export const insertFollowSchema = z.object({
  publicationId: z.string().min(1).max(50),
});

export type PublicationFollow = typeof publicationFollows.$inferSelect;
```

- [ ] **Step 2: Generate the migration (do NOT push)**

Run: `npx drizzle-kit generate`
Expected: a new SQL migration file appears under `migrations/` creating `publication_follows`. Do not run `db:push`; the user applies it. Commit the generated SQL.

- [ ] **Step 3: Type-check**

Run: `npm run check:types`
Expected: PASS (no type errors from the new exports).

- [ ] **Step 4: Commit**

```bash
git add shared/schema.ts migrations/
git commit -m "feat: add publication_follows table and schema"
```

### Task 1.2: Storage methods for follows

**Files:**
- Modify: `server/storage.ts` (add methods near `getSavedArticleIds`)
- Test: `server/follows.test.ts`

**Interfaces:**
- Consumes: `publicationFollows`, `db` from existing storage module.
- Produces: `storage.getFollows(userId): Promise<string[]>`, `storage.addFollow(userId, publicationId): Promise<void>`, `storage.removeFollow(userId, publicationId): Promise<void>`.

- [ ] **Step 1: Write the failing test** in `server/follows.test.ts`

```ts
import { describe, it, expect, vi } from "vitest";

// The storage module talks to Drizzle; we assert the query-builder calls.
// Follow the mocking style already used in server/*.test.ts (e.g. accountDeletion.test.ts).
import { storage } from "./storage";

describe("follows storage", () => {
  it("addFollow is idempotent (onConflictDoNothing)", async () => {
    // Arrange a spy on db.insert(...).values(...).onConflictDoNothing()
    // Assert addFollow calls insert with { userId, publicationId }
    // and chains onConflictDoNothing.
    expect(typeof storage.addFollow).toBe("function");
  });

  it("getFollows returns an array of publicationIds", async () => {
    expect(typeof storage.getFollows).toBe("function");
  });
});
```

> Match the existing test framework: check whether repo `*.test.ts` use `vitest` or `jest` (see `server/accountDeletion.test.ts` imports) and use the same. Replace the placeholder assertions with real db-mock assertions following that file's pattern.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- follows`
Expected: FAIL (`storage.addFollow is not a function`).

- [ ] **Step 3: Implement the methods in `server/storage.ts`**

```ts
async getFollows(userId: string): Promise<string[]> {
  const rows = await db
    .select({ publicationId: publicationFollows.publicationId })
    .from(publicationFollows)
    .where(eq(publicationFollows.userId, userId));
  return rows.map((r) => r.publicationId);
}

async addFollow(userId: string, publicationId: string): Promise<void> {
  await db
    .insert(publicationFollows)
    .values({ userId, publicationId })
    .onConflictDoNothing();
}

async removeFollow(userId: string, publicationId: string): Promise<void> {
  await db
    .delete(publicationFollows)
    .where(
      and(
        eq(publicationFollows.userId, userId),
        eq(publicationFollows.publicationId, publicationId),
      ),
    );
}
```

Add `publicationFollows` to the schema import and ensure `and`, `eq` are imported from `drizzle-orm` (they already are for other methods).

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- follows`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/storage.ts server/follows.test.ts
git commit -m "feat: add follows storage methods"
```

### Task 1.3: Follows API routes

**Files:**
- Modify: `server/routes.ts` (add routes near the `/api/articles/saved` routes, ~line 1202)

**Interfaces:**
- Consumes: `storage.getFollows/addFollow/removeFollow`, `insertFollowSchema`, `requireAuth`.
- Produces: `GET /api/follows`, `POST /api/follows`, `DELETE /api/follows/:publicationId`.

- [ ] **Step 1: Add a known-publication guard**

`shared/publications.ts` exports `isValidPublicationId(id)` but its `PUBLICATION_CONFIGS` only covers the 9 WordPress publications — it rejects the external ones (`kply`, `proof`, `viaverde`). Follows must accept any real publication ID. Define the full set in `server/routes.ts`:

```ts
const VALID_PUBLICATION_IDS = new Set([
  "palyvoice", "infocus", "campanile", "verde", "cmag", "viking",
  "anthro", "archive", "ink", "veritas", "viaverde", "kply", "proof",
]);
```

- [ ] **Step 2: Add the routes**

```ts
app.get("/api/follows", requireAuth, async (req, res) => {
  try {
    const userId = (req.session as any).userId;
    const publicationIds = await storage.getFollows(userId);
    res.json({ publicationIds });
  } catch (error) {
    console.error("Get follows error:", error);
    res.status(500).json({ error: "Failed to get follows" });
  }
});

app.post("/api/follows", requireAuth, async (req, res) => {
  try {
    const userId = (req.session as any).userId;
    const result = insertFollowSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: fromZodError(result.error).message });
    }
    if (!VALID_PUBLICATION_IDS.has(result.data.publicationId)) {
      return res.status(400).json({ error: "Unknown publication" });
    }
    await storage.addFollow(userId, result.data.publicationId);
    res.json({ success: true });
  } catch (error) {
    console.error("Add follow error:", error);
    res.status(500).json({ error: "Failed to follow publication" });
  }
});

app.delete("/api/follows/:publicationId", requireAuth, async (req, res) => {
  try {
    const userId = (req.session as any).userId;
    await storage.removeFollow(userId, req.params.publicationId);
    res.json({ success: true });
  } catch (error) {
    console.error("Remove follow error:", error);
    res.status(500).json({ error: "Failed to unfollow publication" });
  }
});
```

Ensure `insertFollowSchema` is imported from `../shared/schema` and `fromZodError` is already imported (it is, used by other routes).

- [ ] **Step 3: Type-check + manual smoke**

Run: `npm run check:types`
Expected: PASS. Then run the server (`npm run server:dev`) and verify `GET /api/follows` returns 401 without a session.

- [ ] **Step 4: Commit**

```bash
git add server/routes.ts
git commit -m "feat: add follows API routes"
```

### Task 1.4: `FollowsContext`

**Files:**
- Create: `client/contexts/FollowsContext.tsx`
- Modify: `client/App.tsx` (register `FollowsProvider` alongside `SavedArticlesProvider`)
- Test: `client/contexts/FollowsContext.test.ts`

**Interfaces:**
- Consumes: `getApiUrl`, `apiRequest` from `@/lib/query-client`; `useAuth`.
- Produces: `useFollows()` → `{ followedPublicationIds: Set<string>, isFollowing(id), followPublication(id), unfollowPublication(id), refreshFollows() }`.

- [ ] **Step 1: Write the failing test**

```ts
import { isFollowingHelper } from "./FollowsContext";

describe("FollowsContext helpers", () => {
  it("isFollowingHelper checks membership", () => {
    const set = new Set(["verde", "palyvoice"]);
    expect(isFollowingHelper(set, "verde")).toBe(true);
    expect(isFollowingHelper(set, "cmag")).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- FollowsContext`
Expected: FAIL (module/export not found).

- [ ] **Step 3: Implement `client/contexts/FollowsContext.tsx`**

Mirror `SavedArticlesContext.tsx`. Include the exported pure helper for testability:

```tsx
import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { getApiUrl } from "@/lib/query-client";
import { useAuth } from "@/contexts/AuthContext";

export function isFollowingHelper(set: Set<string>, id: string): boolean {
  return set.has(id);
}

interface FollowsContextType {
  followedPublicationIds: Set<string>;
  isLoading: boolean;
  isFollowing: (publicationId: string) => boolean;
  followPublication: (publicationId: string) => Promise<boolean>;
  unfollowPublication: (publicationId: string) => Promise<boolean>;
  refreshFollows: () => Promise<void>;
}

const FollowsContext = createContext<FollowsContextType | undefined>(undefined);

export function FollowsProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [followedPublicationIds, setFollowedPublicationIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);

  const refreshFollows = useCallback(async () => {
    if (!isAuthenticated) {
      setFollowedPublicationIds(new Set());
      return;
    }
    try {
      setIsLoading(true);
      const res = await fetch(new URL("/api/follows", getApiUrl()).toString(), { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setFollowedPublicationIds(new Set<string>(data.publicationIds));
      }
    } catch (e) {
      console.error("Failed to fetch follows:", e);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => { refreshFollows(); }, [refreshFollows]);

  const followPublication = async (publicationId: string): Promise<boolean> => {
    try {
      const res = await fetch(new URL("/api/follows", getApiUrl()).toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ publicationId }),
      });
      if (!res.ok) return false;
      setFollowedPublicationIds((prev) => new Set(prev).add(publicationId));
      return true;
    } catch (e) {
      console.error("Follow failed:", e);
      return false;
    }
  };

  const unfollowPublication = async (publicationId: string): Promise<boolean> => {
    try {
      const res = await fetch(new URL(`/api/follows/${publicationId}`, getApiUrl()).toString(), {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) return false;
      setFollowedPublicationIds((prev) => {
        const next = new Set(prev);
        next.delete(publicationId);
        return next;
      });
      return true;
    } catch (e) {
      console.error("Unfollow failed:", e);
      return false;
    }
  };

  const isFollowing = (publicationId: string) => isFollowingHelper(followedPublicationIds, publicationId);

  return (
    <FollowsContext.Provider value={{ followedPublicationIds, isLoading, isFollowing, followPublication, unfollowPublication, refreshFollows }}>
      {children}
    </FollowsContext.Provider>
  );
}

export function useFollows(): FollowsContextType {
  const ctx = useContext(FollowsContext);
  if (!ctx) throw new Error("useFollows must be used within a FollowsProvider");
  return ctx;
}
```

- [ ] **Step 4: Register the provider** in the app root next to `SavedArticlesProvider` (wrap so `useAuth` is available to it).

- [ ] **Step 5: Run tests + type-check**

Run: `npm test -- FollowsContext && npm run check:types`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add client/contexts/FollowsContext.tsx client/contexts/FollowsContext.test.ts
git commit -m "feat: add FollowsContext"
```

### Task 1.5: `useUnifiedFeed` publication filter + Follow toggle + "For You"

**Files:**
- Modify: `client/hooks/useUnifiedFeed.ts` (add `publicationIds` option)
- Modify: `client/screens/HomeScreen.tsx` (For You entry + pass filter)
- Modify: the publication switcher/header component (add Follow toggle) — find via `grep -rln "usePublication\|PublicationSwitcher\|switcher" client/components`
- Test: `client/hooks/useUnifiedFeed.test.ts`

**Interfaces:**
- Consumes: `useFollows`.
- Produces: `useUnifiedFeed({ category?, publicationIds? })` where `publicationIds` restricts the source publications (default all `FEED_PUBLICATIONS`).

- [ ] **Step 1: Write the failing test** (pure selection helper)

Extract the source-selection into a testable helper in `useUnifiedFeed.ts`:

```ts
import { selectFeedPublicationIds } from "./useUnifiedFeed";

describe("selectFeedPublicationIds", () => {
  it("returns all feed publications when no filter", () => {
    const ids = selectFeedPublicationIds(undefined);
    expect(ids.length).toBeGreaterThan(1);
  });
  it("restricts to the given ids (intersected with feed pubs)", () => {
    expect(selectFeedPublicationIds(["verde"])).toEqual(["verde"]);
  });
  it("falls back to all when the filter is empty", () => {
    expect(selectFeedPublicationIds([]).length).toBeGreaterThan(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- useUnifiedFeed`
Expected: FAIL (export not found).

- [ ] **Step 3: Implement the helper and option**

```ts
export function selectFeedPublicationIds(filter?: string[]): string[] {
  const all = FEED_PUBLICATIONS.map((p) => p.id);
  if (!filter || filter.length === 0) return all;
  const set = new Set(filter);
  return all.filter((id) => set.has(id));
}
```

Add `publicationIds?: string[]` to `UseUnifiedFeedOptions` and use `selectFeedPublicationIds(options.publicationIds)` wherever the hook currently iterates `FEED_PUBLICATIONS`.

- [ ] **Step 4: Wire "For You" in HomeScreen**

Add a "For You" category chip to `CategoryTabs` (or a For-You/All toggle). When active and `followedPublicationIds.size > 0`, call `useUnifiedFeed({ publicationIds: Array.from(followedPublicationIds) })`; otherwise render the normal feed plus an inline "Follow publications to personalize" prompt. Import `useFollows`.

- [ ] **Step 5: Add the Follow toggle** to the publication switcher/header: a button calling `followPublication`/`unfollowPublication`, labeled `accessibilityLabel={isFollowing(id) ? "Unfollow ${name}" : "Follow ${name}"}` and `accessibilityRole="button"`.

- [ ] **Step 6: Run tests + type-check, then manual check**

Run: `npm test -- useUnifiedFeed && npm run check:types`
Expected: PASS. Manually: follow a publication, open For You, verify only followed pubs appear; unfollow, verify fallback.

- [ ] **Step 7: Commit**

```bash
git add client/hooks/useUnifiedFeed.ts client/hooks/useUnifiedFeed.test.ts client/screens/HomeScreen.tsx client/components/
git commit -m "feat: add For You feed and follow toggle"
```

---

## Phase 2 — Civic / Local Lens

A dedicated Civic tab filtering the unified feed by curated categories + keywords, with context cards.

### Task 2.1: Civic classification config + `isCivicArticle`

**Files:**
- Create: `client/constants/civic.ts`
- Test: `client/constants/civic.test.ts`

**Interfaces:**
- Consumes: `ArticleWithSource` from `@/types/article`.
- Produces: `CIVIC_CATEGORY_MAP`, `CIVIC_KEYWORDS`, `isCivicArticle(article: ArticleWithSource): boolean`.

- [ ] **Step 1: Write the failing test** in `client/constants/civic.test.ts`

```ts
import { isCivicArticle } from "./civic";
import type { ArticleWithSource } from "@/types/article";

function make(partial: Partial<ArticleWithSource>): ArticleWithSource {
  return {
    id: 1,
    title: { rendered: "" },
    excerpt: { rendered: "" },
    content: { rendered: "" },
    date: "2026-01-01",
    publicationId: "palyvoice",
    publicationName: "The Paly Voice",
    publicationColor: "#000",
    ...partial,
  } as ArticleWithSource;
}

describe("isCivicArticle", () => {
  it("matches by keyword in the title", () => {
    expect(isCivicArticle(make({ title: { rendered: "School Board approves new budget" } }))).toBe(true);
  });
  it("matches by mapped category slug", () => {
    const a = make({ _embedded: { "wp:term": [[{ id: 5, name: "News", slug: "news", taxonomy: "category" }]] } });
    expect(isCivicArticle(a)).toBe(true);
  });
  it("rejects non-civic articles", () => {
    expect(isCivicArticle(make({ title: { rendered: "Boys basketball wins final" } }))).toBe(false);
  });
  it("handles missing _embedded and empty excerpt", () => {
    expect(isCivicArticle(make({}))).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- civic`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement `client/constants/civic.ts`**

```ts
import type { ArticleWithSource } from "@/types/article";

// Civic-related WordPress category slugs per publication.
// Start conservative; expand after reviewing each publication's real categories.
export const CIVIC_CATEGORY_MAP: Record<string, string[]> = {
  palyvoice: ["news", "government", "elections", "community"],
  campanile: ["news", "opinion"],
  verde: ["news", "features"],
  cmag: ["news"],
  viking: [],
  infocus: ["news"],
  anthro: [],
  ink: [],
  veritas: ["news"],
};

export const CIVIC_KEYWORDS: string[] = [
  "election", "ballot", "vote", "voter", "school board", "board of education",
  "city council", "council", "policy", "legislation", "measure", "referendum",
  "mayor", "district", "government", "congress", "senate", "assembly",
];

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/&[a-z]+;/gi, " ");
}

export function isCivicArticle(article: ArticleWithSource): boolean {
  const civicSlugs = CIVIC_CATEGORY_MAP[article.publicationId] ?? [];
  const terms = article._embedded?.["wp:term"]?.flat() ?? [];
  const hasCivicCategory = terms.some(
    (t) => t.taxonomy === "category" && civicSlugs.includes(t.slug),
  );
  if (hasCivicCategory) return true;

  const haystack = (
    stripHtml(article.title.rendered) + " " + stripHtml(article.excerpt.rendered)
  ).toLowerCase();
  return CIVIC_KEYWORDS.some((kw) => haystack.includes(kw));
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- civic`
Expected: PASS (all four cases).

- [ ] **Step 5: Commit**

```bash
git add client/constants/civic.ts client/constants/civic.test.ts
git commit -m "feat: add civic article classification"
```

### Task 2.2: `useCivicFeed` hook

**Files:**
- Create: `client/hooks/useCivicFeed.ts`

**Interfaces:**
- Consumes: `useUnifiedFeed`, `isCivicArticle`.
- Produces: `useCivicFeed()` → same shape as `useUnifiedFeed` (`{ articles, loading, loadingMore, error, hasMore, loadMore, refresh }`) but filtered to civic articles.

- [ ] **Step 1: Implement the hook**

```ts
import { useMemo } from "react";
import { useUnifiedFeed } from "./useUnifiedFeed";
import { isCivicArticle } from "@/constants/civic";

export function useCivicFeed() {
  const feed = useUnifiedFeed();
  const articles = useMemo(
    () => feed.articles.filter(isCivicArticle),
    [feed.articles],
  );
  return { ...feed, articles };
}
```

> If civic results per page are too sparse, raise `ARTICLES_PER_PUBLICATION` handling by adding an optional `perPage` option to `useUnifiedFeed` and passing a larger value here. Defer unless testing shows empty pages.

- [ ] **Step 2: Type-check**

Run: `npm run check:types`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add client/hooks/useCivicFeed.ts
git commit -m "feat: add useCivicFeed hook"
```

### Task 2.3: Context cards config

**Files:**
- Create: `client/constants/civicContext.ts`

**Interfaces:**
- Produces: `CIVIC_CONTEXT_CARDS: { id: string; title: string; body: string }[]`.

- [ ] **Step 1: Implement**

```ts
export interface CivicContextCard {
  id: string;
  title: string;
  body: string;
}

// Non-partisan, informational only. No endorsements.
export const CIVIC_CONTEXT_CARDS: CivicContextCard[] = [
  {
    id: "school-board",
    title: "What the school board does",
    body: "The Palo Alto Unified School District Board of Education sets district policy, approves the budget, and oversees the superintendent. Meetings are open to the public.",
  },
  {
    id: "attend-meeting",
    title: "How to attend a board meeting",
    body: "Board meetings are held at the district office and streamed online. Agendas are posted in advance, and community members may sign up to give public comment.",
  },
  {
    id: "why-local-news",
    title: "Why local reporting matters",
    body: "Student journalists cover decisions that affect your school and community. Following local coverage is one of the simplest ways to stay civically informed.",
  },
];
```

- [ ] **Step 2: Commit**

```bash
git add client/constants/civicContext.ts
git commit -m "feat: add civic context cards content"
```

### Task 2.4: CivicScreen + navigation

**Files:**
- Create: `client/screens/CivicScreen.tsx`
- Create: `client/navigation/CivicStackNavigator.tsx`
- Modify: `client/navigation/MainTabNavigator.tsx` (add Civic tab)

**Interfaces:**
- Consumes: `useCivicFeed`, `CIVIC_CONTEXT_CARDS`, existing `ArticleCard`, `EmptyState`, `ThemedText`.

- [ ] **Step 1: Implement `CivicScreen`**

Render a header ("Civic & Local — coverage of government, elections, and community from Paly's newsrooms"), the `CIVIC_CONTEXT_CARDS` as styled cards, then the civic feed list using the same `ArticleCard` rendering Home uses. Empty state via `EmptyState` when `articles.length === 0 && !loading`. Reuse Home's list patterns (RefreshControl, onEndReached → `loadMore`). Add `accessibilityRole="header"` to the section title.

- [ ] **Step 2: Implement `CivicStackNavigator`**

Mirror `HomeStackNavigator.tsx`: a native stack with `CivicScreen` as the root and `ArticleDetailScreen` pushed for taps (reuse the same detail screen registration pattern as the Home stack).

- [ ] **Step 3: Add the Civic tab** in `MainTabNavigator.tsx`

Insert between the News and Calendar tabs:

```tsx
<Tab.Screen
  name="CivicTab"
  component={CivicStackNavigator}
  options={{
    title: "Civic",
    tabBarIcon: ({ color, size }) => (
      <Feather name="flag" color={color} size={size} />
    ),
  }}
/>
```

Use whatever icon set the other tabs use; match their `options` shape.

- [ ] **Step 4: Type-check + manual check**

Run: `npm run check:types`
Expected: PASS. Manually: open the Civic tab, confirm context cards + only civic articles show, tapping opens detail.

- [ ] **Step 5: Commit**

```bash
git add client/screens/CivicScreen.tsx client/navigation/CivicStackNavigator.tsx client/navigation/MainTabNavigator.tsx
git commit -m "feat: add Civic tab, screen, and navigation"
```

---

## Phase 3 — Offline Reading

Persist saved articles + the ~15 newest feed articles for offline reading.

### Task 3.1: `offlineStore` module

**Files:**
- Create: `client/lib/offlineStore.ts`
- Test: `client/lib/offlineStore.test.ts`

**Interfaces:**
- Consumes: `expo-file-system`, `@react-native-async-storage/async-storage`, `ArticleWithSource`.
- Produces: `cacheArticle(article, reason)`, `getCachedArticle(id)`, `getCachedArticleIds()`, `removeCachedArticle(id)`, `pruneRecent(max?)`, and a pure `selectPruneVictims(index, max)` helper.

- [ ] **Step 1: Write the failing test** for the pure pruning helper

```ts
import { selectPruneVictims } from "./offlineStore";

describe("selectPruneVictims", () => {
  const idx = {
    1: { reason: "saved", cachedAt: 100 },
    2: { reason: "recent", cachedAt: 200 },
    3: { reason: "recent", cachedAt: 300 },
    4: { reason: "recent", cachedAt: 400 },
  } as const;

  it("never evicts saved articles", () => {
    const victims = selectPruneVictims(idx as any, 1);
    expect(victims).not.toContain(1);
  });
  it("evicts oldest recent beyond the cap", () => {
    // cap of 1 recent → keep id 4 (newest), evict 2 and 3
    expect(selectPruneVictims(idx as any, 1).sort()).toEqual([2, 3]);
  });
  it("evicts nothing when under the cap", () => {
    expect(selectPruneVictims(idx as any, 10)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- offlineStore`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement `client/lib/offlineStore.ts`**

```ts
import * as FileSystem from "expo-file-system";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { ArticleWithSource } from "@/types/article";

const DIR = FileSystem.documentDirectory + "offline/";
const INDEX_KEY = "@paly/offline_index";

export type CacheReason = "saved" | "recent";
export interface IndexEntry { reason: CacheReason; cachedAt: number }
export type OfflineIndex = Record<number, IndexEntry>;

export function selectPruneVictims(index: OfflineIndex, maxRecent: number): number[] {
  const recent = Object.entries(index)
    .filter(([, e]) => e.reason === "recent")
    .sort((a, b) => b[1].cachedAt - a[1].cachedAt) // newest first
    .map(([id]) => Number(id));
  return recent.slice(maxRecent);
}

async function readIndex(): Promise<OfflineIndex> {
  const raw = await AsyncStorage.getItem(INDEX_KEY);
  return raw ? JSON.parse(raw) : {};
}
async function writeIndex(index: OfflineIndex): Promise<void> {
  await AsyncStorage.setItem(INDEX_KEY, JSON.stringify(index));
}
async function ensureDir(): Promise<void> {
  const info = await FileSystem.getInfoAsync(DIR);
  if (!info.exists) await FileSystem.makeDirectoryAsync(DIR, { intermediates: true });
}
const fileFor = (id: number) => `${DIR}${id}.json`;

export async function cacheArticle(article: ArticleWithSource, reason: CacheReason): Promise<void> {
  try {
    await ensureDir();
    await FileSystem.writeAsStringAsync(fileFor(article.id), JSON.stringify(article));
    const index = await readIndex();
    const prev = index[article.id];
    // A saved article stays "saved" even if also seen as recent.
    const nextReason: CacheReason = prev?.reason === "saved" ? "saved" : reason;
    index[article.id] = { reason: nextReason, cachedAt: Date.now() };
    await writeIndex(index);
  } catch (e) {
    console.error("cacheArticle failed:", e);
  }
}

export async function getCachedArticle(id: number): Promise<ArticleWithSource | null> {
  try {
    const info = await FileSystem.getInfoAsync(fileFor(id));
    if (!info.exists) return null;
    const raw = await FileSystem.readAsStringAsync(fileFor(id));
    return JSON.parse(raw) as ArticleWithSource;
  } catch { return null; }
}

export async function getCachedArticleIds(): Promise<number[]> {
  const index = await readIndex();
  return Object.keys(index).map(Number);
}

export async function removeCachedArticle(id: number): Promise<void> {
  try {
    await FileSystem.deleteAsync(fileFor(id), { idempotent: true });
    const index = await readIndex();
    delete index[id];
    await writeIndex(index);
  } catch (e) { console.error("removeCachedArticle failed:", e); }
}

export async function pruneRecent(maxRecent = 15): Promise<void> {
  const index = await readIndex();
  const victims = selectPruneVictims(index, maxRecent);
  for (const id of victims) await removeCachedArticle(id);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- offlineStore`
Expected: PASS (three pruning cases).

- [ ] **Step 5: Commit**

```bash
git add client/lib/offlineStore.ts client/lib/offlineStore.test.ts
git commit -m "feat: add offline article store"
```

> Note: the test targets the pure `selectPruneVictims`. `Date.now()` is used in `cacheArticle` only (not in the tested helper), so tests stay deterministic.

### Task 3.2: Cache on save/unsave

**Files:**
- Modify: `client/contexts/SavedArticlesContext.tsx`

- [ ] **Step 1: On successful `saveArticle`**, also cache the full article. The current `saveArticle` receives a metadata subset; extend its call sites and the context method to accept the full `ArticleWithSource` (or the fields `offlineStore`/detail need) and call `cacheArticle(article, "saved")` after the server save succeeds.

- [ ] **Step 2: On `unsaveArticle`**, call `removeCachedArticle(articleId)` after the server delete succeeds — but only if the index entry `reason === "saved"` (a "recent" copy may still be wanted). Simplest correct rule: after removal, re-add as recent is unnecessary; just `removeCachedArticle` — recents get re-cached on next feed load. Keep it as `removeCachedArticle(articleId)`.

- [ ] **Step 3: Type-check + manual check**

Run: `npm run check:types`
Expected: PASS. Manually: save an article, enable airplane mode, open it from Saved → content renders.

- [ ] **Step 4: Commit**

```bash
git add client/contexts/SavedArticlesContext.tsx client/screens/
git commit -m "feat: cache saved articles for offline reading"
```

### Task 3.3: Cache newest feed articles

**Files:**
- Modify: `client/screens/HomeScreen.tsx`

- [ ] **Step 1: After the unified feed finishes loading** (in an effect keyed on the loaded articles), cache the top 15 and prune:

```ts
useEffect(() => {
  if (!articles.length) return;
  (async () => {
    for (const a of articles.slice(0, 15)) {
      await cacheArticle(a, "recent");
    }
    await pruneRecent(15);
  })();
}, [articles]);
```

Import `cacheArticle, pruneRecent` from `@/lib/offlineStore`.

- [ ] **Step 2: Type-check**

Run: `npm run check:types`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add client/screens/HomeScreen.tsx
git commit -m "feat: cache newest feed articles for offline"
```

### Task 3.4: Connectivity hook + offline banner + read fallback

**Files:**
- Create: `client/hooks/useConnectivity.ts`
- Modify: app shell/Home header (banner), `client/screens/ArticleDetailScreen.tsx` (read fallback + badge)
- Test: `client/hooks/useConnectivity.test.ts`

**Interfaces:**
- Consumes: `@react-native-community/netinfo`.
- Produces: `useConnectivity()` → `{ isOffline: boolean }`; `deriveIsOffline(state)` pure helper.

- [ ] **Step 1: Install the dependency**

Run: `npx expo install @react-native-community/netinfo`
Expected: added to `package.json`.

- [ ] **Step 2: Write the failing test** for the pure helper

```ts
import { deriveIsOffline } from "./useConnectivity";

describe("deriveIsOffline", () => {
  it("offline when not connected", () => {
    expect(deriveIsOffline({ isConnected: false, isInternetReachable: false } as any)).toBe(true);
  });
  it("online when connected and reachable", () => {
    expect(deriveIsOffline({ isConnected: true, isInternetReachable: true } as any)).toBe(false);
  });
  it("treats null reachability as online (optimistic)", () => {
    expect(deriveIsOffline({ isConnected: true, isInternetReachable: null } as any)).toBe(false);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test -- useConnectivity`
Expected: FAIL.

- [ ] **Step 4: Implement `client/hooks/useConnectivity.ts`**

```ts
import { useEffect, useState } from "react";
import NetInfo, { type NetInfoState } from "@react-native-community/netinfo";

export function deriveIsOffline(state: Pick<NetInfoState, "isConnected" | "isInternetReachable">): boolean {
  if (state.isConnected === false) return true;
  if (state.isInternetReachable === false) return true;
  return false; // null reachability → assume online
}

export function useConnectivity(): { isOffline: boolean } {
  const [isOffline, setIsOffline] = useState(false);
  useEffect(() => {
    const unsub = NetInfo.addEventListener((state) => setIsOffline(deriveIsOffline(state)));
    return () => unsub();
  }, []);
  return { isOffline };
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test -- useConnectivity`
Expected: PASS.

- [ ] **Step 6: Offline banner** — render a small banner ("You're offline — showing saved articles") in the Home header/app shell when `useConnectivity().isOffline`. Give it `accessibilityRole="alert"`.

- [ ] **Step 7: Read fallback in `ArticleDetailScreen`** — when a live fetch fails or `isOffline`, load via `getCachedArticle(id)`; if present, render it and show an "Available offline" badge; if absent, show a clear "Not available offline" message (not a spinner).

- [ ] **Step 8: Type-check + manual airplane-mode check**

Run: `npm run check:types`
Expected: PASS. Manually verify banner appears and cached articles open offline.

- [ ] **Step 9: Commit**

```bash
git add client/hooks/useConnectivity.ts client/hooks/useConnectivity.test.ts client/screens/ArticleDetailScreen.tsx client/screens/HomeScreen.tsx package.json
git commit -m "feat: add connectivity detection, offline banner, and read fallback"
```

---

## Phase 4 — Accessibility (TTS + a11y pass)

### Task 4.1: `useArticleSpeech` hook

**Files:**
- Create: `client/hooks/useArticleSpeech.ts`
- Test: `client/hooks/useArticleSpeech.test.ts`

**Interfaces:**
- Consumes: `expo-speech`.
- Produces: `useArticleSpeech()` → `{ status, speak(html), pause(), resume(), stop() }`; pure `htmlToSpeechText(html)` helper.

- [ ] **Step 1: Install the dependency**

Run: `npx expo install expo-speech`
Expected: added to `package.json`. Add to `app.json` plugins if the module requires it.

- [ ] **Step 2: Write the failing test** for the pure helper

```ts
import { htmlToSpeechText } from "./useArticleSpeech";

describe("htmlToSpeechText", () => {
  it("strips tags and decodes basic entities", () => {
    expect(htmlToSpeechText("<p>Hello &amp; welcome</p>")).toBe("Hello & welcome");
  });
  it("collapses whitespace", () => {
    expect(htmlToSpeechText("<p>a</p>\n\n<p>b</p>")).toBe("a b");
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test -- useArticleSpeech`
Expected: FAIL.

- [ ] **Step 4: Implement `client/hooks/useArticleSpeech.ts`**

```ts
import { useCallback, useEffect, useRef, useState } from "react";
import * as Speech from "expo-speech";

export type SpeechStatus = "idle" | "playing" | "paused";

export function htmlToSpeechText(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function useArticleSpeech() {
  const [status, setStatus] = useState<SpeechStatus>("idle");
  const textRef = useRef<string>("");

  useEffect(() => () => { Speech.stop(); }, []);

  const speak = useCallback((html: string) => {
    const text = htmlToSpeechText(html);
    textRef.current = text;
    Speech.stop();
    setStatus("playing");
    Speech.speak(text, {
      onDone: () => setStatus("idle"),
      onStopped: () => setStatus("idle"),
      onError: () => setStatus("idle"),
    });
  }, []);

  const pause = useCallback(() => { Speech.pause(); setStatus("paused"); }, []);
  const resume = useCallback(() => { Speech.resume(); setStatus("playing"); }, []);
  const stop = useCallback(() => { Speech.stop(); setStatus("idle"); }, []);

  return { status, speak, pause, resume, stop };
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test -- useArticleSpeech`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add client/hooks/useArticleSpeech.ts client/hooks/useArticleSpeech.test.ts package.json
git commit -m "feat: add article text-to-speech hook"
```

### Task 4.2: Listen control in ArticleDetailScreen

**Files:**
- Modify: `client/screens/ArticleDetailScreen.tsx`

- [ ] **Step 1: Add a ▶ Listen control** in the article header/toolbar. Wire to `useArticleSpeech`: idle → show "Listen" (calls `speak(article.content.rendered)`); playing → show "Pause" (`pause`); paused → show "Resume" (`resume`); include a Stop affordance. Label with `accessibilityLabel` reflecting the action and `accessibilityRole="button"`. Stop speech on unmount / when navigating away (hook already stops on unmount).

- [ ] **Step 2: Type-check + manual check**

Run: `npm run check:types`
Expected: PASS. Manually: open an article, tap Listen, hear playback; pause/resume/stop work; leaving the screen stops audio.

- [ ] **Step 3: Commit**

```bash
git add client/screens/ArticleDetailScreen.tsx
git commit -m "feat: add Listen to article control"
```

### Task 4.3: `useReduceMotion` + gate animations

**Files:**
- Create: `client/hooks/useReduceMotion.ts`
- Modify: `client/screens/HomeScreen.tsx` (and other screens using `FadeInUp`/`LinearTransition`)
- Test: `client/hooks/useReduceMotion.test.ts`

**Interfaces:**
- Produces: `useReduceMotion(): boolean`.

- [ ] **Step 1: Write the failing test**

```ts
import { AccessibilityInfo } from "react-native";
import { renderHook, waitFor } from "@testing-library/react-native";
import { useReduceMotion } from "./useReduceMotion";

describe("useReduceMotion", () => {
  it("reflects the initial reduce-motion setting", async () => {
    jest.spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockResolvedValue(true);
    jest.spyOn(AccessibilityInfo, "addEventListener").mockReturnValue({ remove: () => {} } as any);
    const { result } = renderHook(() => useReduceMotion());
    await waitFor(() => expect(result.current).toBe(true));
  });
});
```

> If `@testing-library/react-native` isn't installed, test only a pure reducer instead: export `reduceMotionFromEvent(enabled)` and assert it returns the boolean. Prefer whichever matches the repo's existing hook tests.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- useReduceMotion`
Expected: FAIL.

- [ ] **Step 3: Implement `client/hooks/useReduceMotion.ts`**

```ts
import { useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";

export function useReduceMotion(): boolean {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((v) => { if (mounted) setReduce(v); });
    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduce);
    return () => { mounted = false; sub.remove(); };
  }, []);
  return reduce;
}
```

- [ ] **Step 4: Gate entrance animations** — in screens using Reanimated `entering={FadeInUp}` / `layout={LinearTransition}`, read `const reduceMotion = useReduceMotion();` and pass `entering={reduceMotion ? undefined : FadeInUp}` (same for layout). Start with `HomeScreen`, then `CivicScreen` and any list with entrance animations.

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test -- useReduceMotion`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add client/hooks/useReduceMotion.ts client/hooks/useReduceMotion.test.ts client/screens/
git commit -m "feat: respect reduce-motion accessibility setting"
```

### Task 4.4: A11y labels + touch targets

**Files:**
- Modify: `client/components/ArticleCard.tsx`, `client/components/ArticleCardFeatured.tsx`, tab bar options in `MainTabNavigator.tsx`, and icon-only buttons across new/high-traffic components.

- [ ] **Step 1: Article cards** — wrap the touchable with `accessibilityRole="button"` and `accessibilityLabel={`${title}, ${publicationName}, article`}`. Ensure the image has `accessible={false}` or an appropriate label so the announcement isn't duplicated.

- [ ] **Step 2: Icon-only buttons** (save, follow, listen, back) — add `accessibilityLabel`, `accessibilityRole="button"`, and `hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}` so tap targets reach ≥44×44.

- [ ] **Step 3: Verify Dynamic Type** — confirm `ThemedText` does not set `allowFontScaling={false}`; where large text would break a fixed-height layout, set a reasonable `maxFontSizeMultiplier` rather than disabling scaling.

- [ ] **Step 4: Manual VoiceOver/TalkBack check**

Enable the screen reader and navigate Home → an article → Listen. Confirm each control announces a clear label and role. Confirm large-text mode is usable.

- [ ] **Step 5: Commit**

```bash
git add client/components/ client/navigation/MainTabNavigator.tsx
git commit -m "feat: add accessibility labels and larger touch targets"
```

---

## Self-Review

**Spec coverage:**
- Follow Publications → Tasks 1.1–1.5 ✓ (schema, storage, routes, context, For You + toggle)
- Civic/Local Lens → Tasks 2.1–2.4 ✓ (classification, feed hook, context cards, tab/screen/nav)
- Offline Reading → Tasks 3.1–3.4 ✓ (store, save-cache, feed-cache, connectivity/banner/fallback)
- Accessibility → Tasks 4.1–4.4 ✓ (TTS hook, Listen control, reduce-motion, labels/touch targets)
- New deps (`expo-speech`, `@react-native-community/netinfo`) → installed in 3.4 / 4.1 ✓

**Placeholder scan:** Code shown for every implementation step; the two "defer unless testing shows…" notes are explicit optional optimizations, not required work.

**Type consistency:** `cacheArticle(article, reason)`, `selectPruneVictims(index, max)`, `deriveIsOffline(state)`, `htmlToSpeechText(html)`, `isCivicArticle(article)`, `selectFeedPublicationIds(filter)`, `useFollows()` names are used consistently across tasks.

**Open verification for implementers (resolve in the relevant task, not blocking):**
- Confirm the repo test runner (`jest` vs `vitest`) from an existing `*.test.ts` and match imports (noted in Tasks 1.2 and 4.3).
- Confirm the exact app-root file that composes providers (`grep -rn "SavedArticlesProvider" client`) for Task 1.4.
- Confirm `shared/publications.ts` exports usable IDs for Task 1.3; else inline the ID set.

