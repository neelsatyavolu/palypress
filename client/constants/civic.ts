import type { ArticleWithSource } from "@/types/article";

// Genuinely-civic WordPress category slugs per publication. Deliberately does
// NOT include broad editorial sections ("news", "opinion", "features") — those
// sweep in general stories (science, sports, arts) that aren't civic. For
// general-news sections, civic detection relies on CIVIC_KEYWORDS below.
// Expand per publication once each one's real civic taxonomy is confirmed.
const CIVIC_SLUGS = ["government", "elections", "politics", "community"];
export const CIVIC_CATEGORY_MAP: Record<string, string[]> = {
  palyvoice: CIVIC_SLUGS,
  campanile: CIVIC_SLUGS,
  verde: CIVIC_SLUGS,
  cmag: CIVIC_SLUGS,
  infocus: CIVIC_SLUGS,
  veritas: CIVIC_SLUGS,
  viking: [],
  anthro: [],
  ink: [],
};

export const CIVIC_KEYWORDS: string[] = [
  "election", "ballot", "vote", "voter", "school board", "board of education",
  "city council", "council", "public policy", "legislation", "ballot measure", "referendum",
  "mayor", "school district", "government", "congress", "senate", "state assembly",
];

// "Local News" is broader than civic/government: it also covers Palo Alto
// community life (a citywide yard sale, an Art Center event, an affordable
// housing opening). Those stories carry no civic category or keyword, so they
// were structurally invisible to the civic-only logic above.
//
// To catch them WITHOUT sweeping in the many campus features & sports stories
// that merely mention "Palo Alto", a local-community match requires BOTH:
//   1. a Palo Alto place anchor, AND
//   2. a community-life signal.
// A place anchor alone is not enough — Paly's own paper mentions "Palo Alto"
// constantly (e.g. "Girls lacrosse wins CCS", "Hacky Sack takes over the Quad").
const LOCAL_PLACE_ANCHOR =
  /\b(palo alto|pausd|east palo alto|epa|midtown|college terrace|barron park|crescent park|old palo alto|california ave(nue)?|university ave(nue)?)\b/i;

export const LOCAL_COMMUNITY_SIGNALS: string[] = [
  "yard sale", "garage sale", "rummage sale", "farmers market", "farmers' market",
  "art center", "community center", "public library", "nonprofit", "non-profit",
  "fundraiser", "food drive", "blood drive", "affordable housing", "apartment complex",
  "housing development", "small business", "local business", "block party", "street fair",
  "street festival", "parade", "neighborhood", "homeless", "shelter", "cooling center",
  "warming center", "warming location", "caltrain", "bike lane", "city of palo alto", "downtown",
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
  if (CIVIC_KEYWORDS.some((kw) => haystack.includes(kw))) return true;

  // Local-community path: place anchor AND community-life signal (see above).
  return (
    LOCAL_PLACE_ANCHOR.test(haystack) &&
    LOCAL_COMMUNITY_SIGNALS.some((s) => haystack.includes(s))
  );
}
