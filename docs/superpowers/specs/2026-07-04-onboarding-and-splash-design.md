# Onboarding & Branded Splash — Design

**Date:** 2026-07-04
**Status:** Approved, ready for implementation plan

## Goal

Give PalyPress a first-run **onboarding carousel** that explains the app unifies
all of Palo Alto High School's Media Arts Center (MAC) journalism publications
into one feed, and give returning users a short (~2–3s) **branded splash** with a
rotating tagline. Both should feel polished and distinctly "Paly."

## Current State

- `client/App.tsx` → `AppShell` renders `AppSplashScreen` as an overlay while
  `fontsLoaded && !authLoading` is false, then fades it out. No fixed duration,
  no onboarding.
- `client/components/AppSplashScreen.tsx` shows the app icon with a pulse and
  hides the native Expo splash on mount.
- 13 publications are unified in the feed (Paly Voice, InFocus, Campanile, Verde,
  C Magazine, Viking, Anthro, Ink, Veritas, Via Verde, KPLY, [proof], Archive).
- Theme (`client/constants/theme.ts`) is a neutral iOS palette (blue `#007AFF`
  accent) with full light/dark support. No school colors currently.
- `@react-native-async-storage/async-storage` and `expo-linear-gradient` are
  already dependencies. `client/lib/appearancePreferences.ts` is the reference
  pattern for AsyncStorage-backed persistence.
- Tests use the **Node native test runner** with `node:assert` (e.g.
  `PublicationSwitcher.test.ts`); `*.test.ts` files test pure logic, not rendered
  components.

## Flow

Both moments are overlays above the app, gated by startup state in `AppShell`:
the existing `fontsLoaded && !authLoading`, plus a new `onboardingComplete` flag.

1. **Every launch:** native Expo splash → **branded splash overlay** (green
   gradient, logo, wordmark, rotating tagline) shown while the app loads
   underneath.
2. **First launch** (`onboardingComplete === false`): splash fades → **3-slide
   onboarding carousel** → user taps *Get Started* (or *Skip*) → flag persisted →
   carousel fades into the app. The timed minimum is **not** enforced here — the
   carousel is the welcome moment.
3. **Returning launch** (`onboardingComplete === true`): splash holds a
   **~2400ms minimum** even if data is cached, then fades straight into the app.

### Startup state in `AppShell`

- `onboardingComplete: boolean | null` — `null` while the flag is being read from
  AsyncStorage; `true`/`false` after.
- The splash's `ready` gate becomes `fontsLoaded && !authLoading &&
  onboardingComplete !== null`.
- `AppSplashScreen` receives `minDurationMs`: `2400` when
  `onboardingComplete === true`, `0` when `false`.
- After the splash finishes, if `onboardingComplete === false`, the
  `OnboardingCarousel` renders as an overlay until completed.

## Components

| File | New/Edit | Role |
|---|---|---|
| `client/constants/onboarding.ts` | new | Slide copy, `ONBOARDING_TAGLINES` array, green/cream palette tokens. Pure data + `pickTagline(seed)` selector. |
| `client/constants/onboarding.test.ts` | new | Tests `pickTagline` (in range, deterministic per seed). |
| `client/lib/onboardingStorage.ts` | new | `getHasOnboarded(): Promise<boolean>` / `setOnboarded(): Promise<void>` over AsyncStorage key `@palypress/onboarding_complete_v1`. Mirrors `appearancePreferences.ts`. |
| `client/lib/onboardingStorage.test.ts` | new | Tests get/set round-trip with a mocked AsyncStorage. |
| `client/components/OnboardingCarousel.tsx` | new | 3 paged slides, page dots, *Skip* + *Next/Get Started*, reanimated transitions. Calls `onComplete()`. |
| `client/components/AppSplashScreen.tsx` | edit | Add green `expo-linear-gradient` backdrop, wordmark under the logo, rotating tagline, and a `minDurationMs` prop that gates `onFinished`. |
| `client/App.tsx` | edit | Read the flag at startup; extend the `ready` gate; render the carousel overlay; pass `minDurationMs`; persist on completion. |

### Pure, testable logic

- `pickTagline(seed: number)` in `onboarding.ts` — deterministic index into the
  taglines array (e.g. `seed % taglines.length`), seeded from a launch counter or
  timestamp passed in by the caller. Kept pure so it is unit-testable without
  `Math.random` nondeterminism in tests.
- The splash's minimum-duration gate: `onFinished` fires only once both `ready`
  is true **and** `minDurationMs` has elapsed since mount.

## Visual & Copy

**Style:** deep Paly-green vertical gradient background, white logo + wordmark,
cream/gold accents on page dots and the primary button. The green backdrop is used
in both light and dark mode (a deliberate branded moment); only fine details
adapt. Palette tokens live in `onboarding.ts` (e.g. `greenTop`, `greenBottom`,
`cream`, `gold`, `textOnGreen`).

**Carousel slides:**

1. **Welcome to PalyPress** — "Every student publication from Palo Alto High
   School's Media Arts Center, together in one feed."
2. **One feed, every voice** — "The Paly Voice, Campanile, Verde, Viking, C
   Magazine, InFocus and more — news, sports, arts, and literary, all in one
   place."
3. **Made yours** — "Follow your favorites, save stories for later, never miss a
   headline." → **[ Get Started ]**

**Rotating splash taglines:**
- "Student journalism, all in one place"
- "Fresh from the Media Arts Center"
- "Palo Alto High School, unified"
- "Every voice, one feed"

## Error Handling

- If reading the AsyncStorage flag fails, treat as **not onboarded is not
  assumed** — instead default to `onboardingComplete = true` (skip onboarding) so
  a storage error never traps a returning user in the intro every launch. Log the
  error; do not surface to UI.
- If `setOnboarded()` write fails, still dismiss the carousel (don't block the
  user); the worst case is the intro reappears next launch. Log the error.
- Splash animation and gradient failures fall back to a solid green background.

## Testing

- `onboarding.test.ts` — `pickTagline` returns an in-range index and is
  deterministic for a given seed; taglines array is non-empty.
- `onboardingStorage.test.ts` — `setOnboarded` then `getHasOnboarded` returns
  `true`; unset returns `false`; a throwing AsyncStorage yields `true` (safe
  default) from `getHasOnboarded`.
- Manual QA: fresh install shows carousel once; relaunch shows ~2.4s splash then
  feed; clearing storage re-triggers onboarding; light + dark both legible.

## Out of Scope (YAGNI)

- No publication-follow selection inside onboarding (Follows already exist
  elsewhere; not requested here).
- No re-show-onboarding setting.
- No remote-configurable copy.
