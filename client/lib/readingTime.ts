/**
 * Utility functions for calculating and formatting reading time estimates
 */

/**
 * Strip HTML tags and entities from content
 */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#8217;/g, "'")
    .replace(/&#8216;/g, "'")
    .replace(/&#8220;/g, '"')
    .replace(/&#8221;/g, '"')
    .replace(/&#8211;/g, "-")
    .replace(/&#8212;/g, "—")
    .replace(/&#8230;/g, "...")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Count words in text
 */
function countWords(text: string): number {
  const words = text.split(/\s+/).filter((word) => word.length > 0);
  return words.length;
}

/**
 * Calculate reading time in minutes from HTML content
 * @param htmlContent - HTML string to analyze
 * @param wordsPerMinute - Average reading speed (default: 250)
 * @returns Reading time in minutes (rounded up)
 */
export function calculateReadingTime(
  htmlContent: string,
  wordsPerMinute: number = 250,
): number {
  const plainText = stripHtml(htmlContent);
  const wordCount = countWords(plainText);
  const minutes = Math.ceil(wordCount / wordsPerMinute);

  // Minimum 1 minute
  return Math.max(1, minutes);
}

/**
 * Format reading time as human-readable string
 * @param minutes - Reading time in minutes
 * @returns Formatted string like "5 min read"
 */
export function formatReadingTime(minutes: number): string {
  if (minutes === 1) {
    return "1 min read";
  }
  return `${minutes} min read`;
}

/**
 * Calculate and format reading time in one call
 * @param htmlContent - HTML string to analyze
 * @param wordsPerMinute - Average reading speed (default: 250)
 * @returns Formatted string like "5 min read"
 */
export function getReadingTimeText(
  htmlContent: string,
  wordsPerMinute: number = 250,
): string {
  const minutes = calculateReadingTime(htmlContent, wordsPerMinute);
  return formatReadingTime(minutes);
}
