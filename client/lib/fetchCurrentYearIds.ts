import { PUBLICATIONS, WORDPRESS_PUBLICATIONS } from "@/constants/publications";

interface StaffYear {
  id: number;
  name: string;
  slug: string;
  count: number;
}

/**
 * Fetches the most recent year ID for a publication
 * @param apiBaseUrl - The WordPress API base URL for the publication
 * @returns The most recent year ID, or null if fetch fails
 */
async function fetchMostRecentYearId(
  apiBaseUrl: string,
): Promise<number | null> {
  try {
    const response = await fetch(
      `${apiBaseUrl}/staff_year?per_page=100&orderby=id&order=desc`,
    );

    if (!response.ok) {
      return null;
    }

    const years: StaffYear[] = await response.json();

    if (years.length === 0) {
      return null;
    }

    // Sort by name (year) descending to get the most recent
    const sortedYears = years.sort((a, b) => b.name.localeCompare(a.name));

    // Return the ID of the most recent year
    return sortedYears[0].id;
  } catch (error) {
    return null;
  }
}

/**
 * Updates the current year IDs for all publications by fetching from their APIs
 * This function should be called when the app initializes
 * @returns A map of publication IDs to their current year IDs
 */
export async function updateCurrentYearIds(): Promise<Map<string, number>> {
  const yearIdMap = new Map<string, number>();

  const promises = WORDPRESS_PUBLICATIONS.map(async (pub) => {
    const yearId = await fetchMostRecentYearId(pub.apiBaseUrl);
    if (yearId !== null) {
      yearIdMap.set(pub.id, yearId);
    } else {
      // Fallback to the configured currentYearId if fetch fails
      yearIdMap.set(pub.id, pub.currentYearId);
    }
  });

  await Promise.all(promises);

  return yearIdMap;
}

/**
 * Gets the current year ID for a publication
 * If dynamic year IDs have been loaded, returns the dynamic value
 * Otherwise returns the static value from publications.ts
 */
export function getCurrentYearId(
  publicationId: string,
  dynamicYearIds?: Map<string, number>,
): number {
  if (dynamicYearIds && dynamicYearIds.has(publicationId)) {
    return dynamicYearIds.get(publicationId)!;
  }

  const publication = PUBLICATIONS.find((p) => p.id === publicationId);
  return publication?.currentYearId || 0;
}
