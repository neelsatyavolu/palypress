// Pure data + helpers for the first-run onboarding carousel and the branded
// splash. Kept free of React Native imports so the logic is unit-testable with
// the Node test runner (see onboarding.test.ts).

export interface OnboardingSlide {
  key: string;
  title: string;
  body: string;
  eyebrow?: string;
}

export const ONBOARDING_SLIDES: OnboardingSlide[] = [
  {
    key: "welcome",
    eyebrow: "A Paly MAC Project",
    title: "Welcome to Paly Press",
    body: "Every student publication from Palo Alto High School's Media Arts Center, together in one feed.",
  },
  {
    key: "voices",
    title: "One feed, all pubs",
    body: "The Paly Voice, The Campanile, Verde, C Magazine, Viking, InFocus, Anthro, Ink, Veritas, Via Verde, KPLY, [proof], and the Paly Journalism Archive — every Paly publication in one place.",
  },
  {
    key: "yours",
    title: "Made yours",
    body: "Follow your favorites, save stories for later, and never miss a headline.",
  },
];

export const ONBOARDING_TAGLINES: string[] = [
  "Student journalism, all in one place",
  "Fresh from the Media Arts Center",
  "Palo Alto High School, unified",
  "Every voice, one feed",
];

// Deep Paly green, used for both light and dark mode — this is a deliberate
// branded moment, so the backdrop stays green regardless of system theme.
export const ONBOARDING_COLORS = {
  greenTop: "#0A3A2A",
  greenBottom: "#12603F",
  cream: "#F5F0E1",
  gold: "#E4B95B",
  textOnGreen: "#FFFFFF",
  textMutedOnGreen: "rgba(255,255,255,0.72)",
  dotInactive: "rgba(255,255,255,0.3)",
} as const;

// Deterministic tagline selection so tests don't depend on Math.random. The
// caller passes a per-launch seed (e.g. Date.now()).
export function pickTagline(seed: number): string {
  const index = Math.abs(Math.floor(seed)) % ONBOARDING_TAGLINES.length;
  return ONBOARDING_TAGLINES[index];
}

export function isLastSlide(current: number, total: number): boolean {
  return current >= total - 1;
}

// Clamp the paged index so advancing past the last slide is a no-op.
export function nextSlideIndex(current: number, total: number): number {
  return Math.min(current + 1, total - 1);
}
