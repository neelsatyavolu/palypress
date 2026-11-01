import { useState, useEffect } from "react";
import { WORDPRESS_PUBLICATIONS } from "@/constants/publications";
import { Category } from "@/components/CategoryTabs";

interface WordPressCategory {
  id: number;
  name: string;
  slug: string;
  count: number;
}

// Categories to filter out (internal/admin categories)
const EXCLUDED_SLUGS = [
  "uncategorized",
  "featured-stories",
  "header",
  "cover",
  "editors-choice",
  "corrected-stories",
  "digital-exclusives",
  "digital-issue",
  "web-exclusive",
];

export interface UnifiedCategory extends Category {
  // Maps publicationId to the category ID for that publication
  publicationMappings: { publicationId: string; categoryId: number }[];
}

const ALL_CATEGORY: UnifiedCategory = {
  id: null,
  name: "All",
  slug: "all",
  publicationMappings: [],
};

// Normalize category name: lowercase, trim, and convert to singular form
function normalizeCategoryName(name: string): string {
  let normalized = name.toLowerCase().trim();

  // Handle common plural -> singular conversions
  // "Features" -> "feature", "Stories" -> "story", etc.
  if (normalized.endsWith("ies")) {
    // "Stories" -> "story", "Categories" -> "category"
    normalized = normalized.slice(0, -3) + "y";
  } else if (normalized.endsWith("es") && !normalized.endsWith("ness")) {
    // "Matches" -> "match", but not "Business" -> "Busins"
    normalized = normalized.slice(0, -2);
  } else if (
    normalized.endsWith("s") &&
    !normalized.endsWith("ss") &&
    !normalized.endsWith("us") &&
    !normalized.endsWith("news")
  ) {
    // "Features" -> "feature", but not "Business" or "News" or "Campus"
    normalized = normalized.slice(0, -1);
  }

  return normalized;
}

export function useUnifiedCategories() {
  const [categories, setCategories] = useState<UnifiedCategory[]>([
    ALL_CATEGORY,
  ]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function fetchAllCategories() {
      setLoading(true);
      setError(null);

      try {
        // Fetch categories from all publications in parallel
        const results = await Promise.allSettled(
          WORDPRESS_PUBLICATIONS.map(async (pub) => {
            const response = await fetch(
              `${pub.apiBaseUrl}/categories?per_page=50&orderby=count&order=desc`,
            );
            if (!response.ok) {
              throw new Error(`Failed to fetch categories from ${pub.name}`);
            }
            const data: WordPressCategory[] = await response.json();
            return { publicationId: pub.id, categories: data };
          }),
        );

        // Merge categories by normalized name (case-insensitive)
        const categoryMap = new Map<
          string,
          {
            displayName: string;
            totalCount: number;
            mappings: { publicationId: string; categoryId: number }[];
          }
        >();

        for (const result of results) {
          if (result.status === "fulfilled") {
            const { publicationId, categories: pubCategories } = result.value;

            for (const cat of pubCategories) {
              // Skip excluded categories
              if (EXCLUDED_SLUGS.includes(cat.slug.toLowerCase())) {
                continue;
              }

              const normalizedName = normalizeCategoryName(cat.name);

              if (categoryMap.has(normalizedName)) {
                const existing = categoryMap.get(normalizedName)!;
                existing.totalCount += cat.count;
                existing.mappings.push({ publicationId, categoryId: cat.id });
              } else {
                categoryMap.set(normalizedName, {
                  displayName: cat.name, // Use first occurrence's display name
                  totalCount: cat.count,
                  mappings: [{ publicationId, categoryId: cat.id }],
                });
              }
            }
          }
        }

        // Sort by total count and take top categories
        // Filter on total count AFTER merging (so "Feature" + "Features" combine their counts)
        const sortedCategories = Array.from(categoryMap.entries())
          .filter(([_, data]) => data.totalCount >= 3)
          .sort((a, b) => b[1].totalCount - a[1].totalCount)
          .slice(0, 8)
          .map(([normalizedName, data]) => ({
            // Generate a stable numeric ID from the normalized name
            id: normalizedName
              .split("")
              .reduce((a, b) => (a << 5) - a + b.charCodeAt(0), 0),
            name: data.displayName,
            slug: normalizedName.replace(/\s+/g, "-"),
            publicationMappings: data.mappings,
          }));

        if (isMounted) {
          setCategories([ALL_CATEGORY, ...sortedCategories]);
        }
      } catch (err) {
        console.error("Error fetching unified categories:", err);
        if (isMounted) {
          setError("Failed to load categories");
          setCategories([ALL_CATEGORY]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchAllCategories();

    return () => {
      isMounted = false;
    };
  }, []);

  return { categories, loading, error };
}
