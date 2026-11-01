/**
 * Utility functions for article data manipulation
 */

import { Article } from "@/types/article";

export interface Category {
  id: number;
  name: string;
  slug: string;
  color?: string;
}

/**
 * Extract categories from article embedded data
 * @param article - Article object with embedded data
 * @returns Array of categories
 */
export function extractCategories(article: Article): Category[] {
  if (!article._embedded?.["wp:term"]) {
    return [];
  }

  // wp:term is an array of term arrays, first array is usually categories
  const termArrays = article._embedded["wp:term"];
  if (!Array.isArray(termArrays) || termArrays.length === 0) {
    return [];
  }

  const categories = termArrays[0] || [];

  return categories.map((cat: any) => ({
    id: cat.id,
    name: cat.name,
    slug: cat.slug,
    color: cat.color || undefined,
  }));
}

/**
 * Get primary category (first one) from article
 * @param article - Article object
 * @returns Primary category or null
 */
export function getPrimaryCategory(article: Article): Category | null {
  const categories = extractCategories(article);
  return categories.length > 0 ? categories[0] : null;
}

/**
 * Extract pull quotes from HTML content
 * Looks for <blockquote> tags in the content
 * @param htmlContent - HTML string
 * @returns Array of quote strings
 */
export function extractPullQuotes(htmlContent: string): string[] {
  const quotes: string[] = [];
  const blockquoteRegex = /<blockquote[^>]*>(.*?)<\/blockquote>/gis;
  let match;

  while ((match = blockquoteRegex.exec(htmlContent)) !== null) {
    const quoteHtml = match[1];
    // Strip HTML tags from the quote
    const quotePlain = quoteHtml
      .replace(/<[^>]*>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#8217;/g, "'")
      .replace(/&#8216;/g, "'")
      .replace(/&#8220;/g, '"')
      .replace(/&#8221;/g, '"')
      .replace(/\s+/g, " ")
      .trim();

    if (quotePlain && quotePlain.length > 20) {
      quotes.push(quotePlain);
    }
  }

  return quotes;
}

/**
 * Extract tags from article embedded data
 * @param article - Article object with embedded data
 * @returns Array of tag names
 */
export function extractTags(article: Article): string[] {
  if (!article._embedded?.["wp:term"]) {
    return [];
  }

  const termArrays = article._embedded["wp:term"];
  if (!Array.isArray(termArrays) || termArrays.length < 2) {
    return [];
  }

  // Second array is usually tags
  const tags = termArrays[1] || [];

  return tags.map((tag: any) => tag.name);
}

/**
 * Get category color with fallback
 * @param category - Category object
 * @param fallbackColor - Fallback color if category has no color
 * @returns Hex color string
 */
export function getCategoryColor(
  category: Category | null,
  fallbackColor: string = "#007AFF",
): string {
  return category?.color || fallbackColor;
}

/**
 * Generate author initials from name
 * @param name - Author name
 * @returns Initials (max 2 characters)
 */
export function getAuthorInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
