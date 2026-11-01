/**
 * Utility functions for extracting and handling video content from articles
 */

/**
 * Fetches InFocus article HTML and extracts embedded YouTube video ID
 * @param articleUrl - The full URL of the InFocus article
 * @returns Promise resolving to video ID or null if no video found
 */
export async function fetchInFocusVideoUrl(
  articleUrl: string,
): Promise<string | null> {
  try {
    const response = await fetch(articleUrl);
    const html = await response.text();

    // Look for YouTube iframe in sno-story-video-area div
    const videoAreaMatch = html.match(
      /<div class="sno-story-video-area">[\s\S]*?<iframe src="(https:\/\/www\.youtube\.com\/embed\/([^"?]+))/,
    );

    if (videoAreaMatch && videoAreaMatch[2]) {
      // Return the video ID (group 2 from regex)
      return videoAreaMatch[2];
    }

    // Fallback: search for any YouTube embed URL
    const fallbackMatch = html.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]+)/);
    if (fallbackMatch && fallbackMatch[1]) {
      return fallbackMatch[1];
    }

    return null;
  } catch (error) {
    console.error("Error fetching InFocus video URL:", error);
    return null;
  }
}
