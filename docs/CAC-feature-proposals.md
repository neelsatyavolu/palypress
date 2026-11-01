# PALY Press — Feature Proposals for the Congressional App Challenge

Three feature directions, written to maximize our score against the actual CAC rubric.
Schoology / bell-schedule / campus-map features are intentionally **out of scope** for now.

---

## How the Congressional App Challenge is actually judged

Source: [2022 CAC Judging Rubric](https://www.congressionalappchallenge.us/wp-content/uploads/2022/09/CAC-Judging-Rubric.pdf), the [Judges page](https://www.congressionalappchallenge.us/get-involved/judges/), and past-winner guidance.

Apps are scored out of **30 points** across two categories:

| Category | What judges reward |
|---|---|
| **Concept** (Ideology + Structure) | Does the app address an **extremely relevant issue or need**? Is the solution original and impactful? Is the **3-minute demo video** organized, engaging, and clear about impact? |
| **Technology** (Function) | Is it functional and navigable? Does it have **complex features**? Is the **code effectively explained**? Is the design innovative and intuitive? |

Judges also read one short answer: **"What technical challenge did you face and how did you solve it?"**

**What this means for us:**

1. **Lead with a community problem.** Past winners are told directly: *"create an app that addresses a problem in your community."* Our winning narrative is the **decline of local news and youth civic disengagement** — a "news desert" problem that a student-press app directly counters. This is a naturally *congressional* theme.
2. **The video is graded, not just the app.** Every feature below is chosen so it produces a clear, engaging 30-second demo moment.
3. **Have a technical-challenge story ready.** Each feature notes the specific hard problem to talk about.

Each proposal below is structured: **Problem → What it is → How it works (technical) → CAC angle → Scope.**

---

## 1. Reader Engagement Loop

Turn readers from passive consumers into contributors, and give student journalists a direct line to their audience.

### Problem it solves
Local and student newsrooms are shrinking, and the ones that survive rarely hear from the community they serve. Meanwhile students *have* opinions but no low-friction, moderated channel to reach the newsroom. We already have comments; the engagement loop closes the gap between **reader → newsroom** and **newsroom → reader**.

### What it is
A two-way engagement system built on top of the existing comment/auth infrastructure:

- **Story tips & letters to the editor** — a simple in-app form ("Have a tip? Suggest a story.") that lets any authenticated student submit a lead or a letter directly to the newsroom, tied to their account.
- **Reactions on articles** — lightweight, structured feedback (e.g. 👍 informative / 🤔 want more / ❤️ moving) beyond raw comments, so trends are measurable.
- **Newsroom inbox** — a moderated queue where editors triage tips/letters (approve, dismiss, mark as "published response").
- **Reader profile of contributions** — extend the existing `MyCommentsScreen` into a "My Contributions" view (comments + tips + reactions).

### How it works (technical)
- **Reuse:** `AuthContext`, `CommentsScreen`/`MyCommentsScreen`, `server/feedback.ts`, `server/routes.ts`, and the Drizzle `users` table already exist. Add `story_tips` and `article_reactions` tables via a Drizzle migration.
- **Moderation:** submissions default to `pending`; only approved letters are visible. This is a real, explainable design decision (safety + spam prevention) — good short-answer material.
- **Notifications:** when an editor responds or publishes a tip, fire a push via the existing `server/pushNotifications.ts` + `NotificationContext`. Closes the loop.
- **Abuse handling:** rate-limit submissions with the existing `express-rate-limit`, validate/sanitize input at the boundary (schema validation), and require auth.

### CAC angle
- **Concept:** empowering a free student press and giving students a civic voice is a strong, original community story.
- **Technology:** moderation pipeline + notifications + new data model = genuine "complex features."
- **Technical-challenge answer:** *"Building a safe, moderated user-submission pipeline — input validation, spam/rate limiting, and a state machine (pending → approved/dismissed → published) — for a teen audience."*
- **Demo moment:** submit a tip on camera → show it land in the newsroom inbox → editor approves → push notification arrives.

### Scope
Medium. Phase it: (1) reactions, (2) tip/letter submission + inbox, (3) response notifications.

---

## 2. Civic / Local Lens

Reframe the app from "school newspaper reader" into a **civic-literacy tool** — the framing most aligned with a *Congressional* challenge.

### Problem it solves
Youth civic disengagement and local-news blind spots are documented national problems. Students produce real coverage of school-board meetings, local elections, ballot measures, and community issues — but it's buried in a general feed alongside sports and arts. Surfacing it deliberately turns scattered reporting into a civic front page.

### What it is
- **A dedicated "Civic / Local" section** — a curated lens that pulls civic- and government-related coverage (board meetings, elections, policy, community) across *all* publications into one view.
- **Topic tagging** — articles classified into civic topics (Government, Elections, Education Policy, Community, Environment).
- **"Why this matters" context cards** — short, factual explainers attached to civic stories (e.g. what the school board does, how to attend a meeting, key dates) to build civic literacy, not just deliver news.
- **Optional:** a non-partisan local civic calendar (board meeting dates, local election deadlines) — clearly informational, never advocacy.

### How it works (technical)
- **Reuse:** the multi-publication aggregation in `server/externalFeeds.ts` + `client/constants/publications.ts` already fans across ~13 publications. The civic lens is a **cross-publication filtered view**, not a new data source.
- **Classification:** start with a curated tag list maintained server-side (deterministic, explainable). A later phase can add keyword/heuristic auto-tagging, or an on-device/LLM-assisted classifier — a strong technical-depth upgrade to demo.
- **Caching:** reuse `server/cache.ts` so the civic feed is fast.
- **Neutrality is a design constraint:** informational only, sourced from student reporting, no endorsements. State this explicitly — it's a maturity signal to judges.

### CAC angle
- **Concept:** this is the single feature that most directly says *"addresses a problem in the community"* in the language a member of Congress cares about — local news + civic engagement.
- **Technology:** cross-source aggregation + a classification system is explainable, non-trivial engineering.
- **Technical-challenge answer:** *"Unifying heterogeneous WordPress feeds from 13 publications into one normalized, tagged civic feed — schema normalization, dedup, and topic classification."*
- **Demo moment:** open the Civic lens → tap a school-board story → show the "Why this matters" context card.

### Scope
Small-to-medium if we start with **manual/curated tags + a filtered view**. The auto-classifier is an optional stretch phase.

---

## 3. Follow Publications (Personalized Feed)

Let readers follow the publications, topics, and authors they care about, and get notified about what's new.

### Problem it solves
Thirteen publications is a lot. A reader who only cares about *Viking* sports and *Verde* features currently wades through everything. No personalization means lower retention — and **retention/adoption is a data point we can cite in the demo video** ("X students use it daily").

### What it is
- **Follow publications** — one-tap follow/unfollow on any of the ~13 publications.
- **Follow topics / authors** — optionally follow a beat (e.g. "Sports," "Opinion") or a specific writer.
- **A personalized "For You" home feed** — merges followed sources, ranked by recency, with an "all publications" fallback so nothing dead-links.
- **New-article alerts** — opt-in push when a followed publication posts.

### How it works (technical)
- **Reuse:** `PublicationContext`, `publications.ts`, `HomeScreen`, and the saved-articles pattern (`saved_articles` table, `SavedArticlesScreen`) are the exact template. Add a `follows` table (`userId`, `targetType`, `targetId`).
- **Feed assembly:** server merges the followed publications' feeds (already fetched via `externalFeeds.ts`), sorts by publish date, paginates. Preserve the existing feature-flag safety pattern from `client/config/features.ts` so an empty follow-set gracefully falls back to the default feed.
- **Notifications:** extend `pushNotifications.ts` + `NotificationCategoriesScreen` with per-publication notification preferences — the category infrastructure already exists.
- **Offline-friendly:** followed content is a natural candidate to pre-cache for offline reading later.

### CAC angle
- **Concept:** improves access to student journalism and drives daily habit — supports an adoption story.
- **Technology:** personalized feed ranking + per-source notification preferences = a clear "complex feature."
- **Technical-challenge answer:** *"Assembling a personalized, paginated feed from multiple external feeds with graceful fallback and per-source notification routing."*
- **Demo moment:** follow two publications → open "For You" → receive a new-article push from a followed publication.

### Scope
Medium. Phase it: (1) follow/unfollow + For You feed, (2) per-publication push, (3) topic/author follows.

---

## Recommended sequencing for the submission

1. **Civic / Local Lens (curated version)** — biggest *Concept*-score lift for least effort; it's the story that wins a *Congressional* challenge.
2. **Reader Engagement Loop** — best *Technology*-score lift and the most compelling live demo (submit → moderate → notify).
3. **Follow Publications** — strongest retention/adoption driver; cite usage numbers in the video.

All three build on infrastructure that already exists (auth, comments, notifications, multi-publication aggregation, caching), so each is additive and demoable — and each gives us a distinct, honest answer to *"what technical challenge did you solve?"*
