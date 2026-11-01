/**
 * Calculate a "hot score" for an article that balances recency with popularity.
 *
 * This algorithm ensures:
 * 1. New articles appear even without upvotes (recency boost)
 * 2. Upvoted articles rank higher
 * 3. Time decay prevents old articles from dominating (infinite scrolling)
 * 4. Older articles can still appear if they have enough upvotes
 *
 * @param upvotes - Number of upvotes the article has
 * @param publishDate - The article's publish date
 * @returns A score where higher is better
 */
export function calculateHotScore(upvotes: number, publishDate: Date): number {
  const now = Date.now();
  const publishTime = publishDate.getTime();
  const ageInHours = (now - publishTime) / (1000 * 60 * 60);

  // Logarithmic upvote score (diminishing returns for very high upvote counts)
  // log10(1) = 0, log10(2) ≈ 0.3, log10(11) ≈ 1.04, log10(101) ≈ 2.0
  const upvoteScore = Math.log10(Math.max(upvotes, 0) + 1);

  // Time decay penalty - older articles get lower scores
  // Gravity of 36 means an article loses ~1 point per 1.5 days
  const GRAVITY = 36;
  const timeDecay = ageInHours / GRAVITY;

  // Recency boost for articles under 24 hours old
  // Brand new articles (0 hours) get +1 boost, 24 hours gets 0 boost
  const recencyBoost = ageInHours < 24 ? (24 - ageInHours) / 24 : 0;

  return upvoteScore - timeDecay + recencyBoost;
}

/**
 * Check if an article should be shown based on its age.
 * Articles older than 2 weeks are filtered out.
 *
 * @param publishDate - The article's publish date
 * @returns true if the article should be shown
 */
export function isArticleRecent(publishDate: Date): boolean {
  const now = Date.now();
  const publishTime = publishDate.getTime();
  const TWO_WEEKS_MS = 14 * 24 * 60 * 60 * 1000;
  return now - publishTime < TWO_WEEKS_MS;
}
