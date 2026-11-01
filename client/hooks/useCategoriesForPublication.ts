import { useState, useEffect } from "react";
import { usePublication } from "@/contexts/PublicationContext";
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

const ALL_CATEGORY: Category = { id: null, name: "All", slug: "all" };

export function useCategoriesForPublication() {
  const { publication } = usePublication();
  const [categories, setCategories] = useState<Category[]>([ALL_CATEGORY]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    // Skip fetching for Home publication (uses unified categories instead)
    if (publication.id === "home" || !publication.apiBaseUrl) {
      setCategories([ALL_CATEGORY]);
      setLoading(false);
      return;
    }

    async function fetchCategories() {
      setLoading(true);
      setError(null);

      try {
        // Fetch categories ordered by post count (most popular first)
        const response = await fetch(
          `${publication.apiBaseUrl}/categories?per_page=50&orderby=count&order=desc`,
        );

        if (!response.ok) {
          throw new Error("Failed to fetch categories");
        }

        const data: WordPressCategory[] = await response.json();

        // Filter out excluded categories and those with very few posts
        const filteredCategories = data
          .filter(
            (cat) =>
              !EXCLUDED_SLUGS.includes(cat.slug.toLowerCase()) &&
              cat.count >= 3, // Only include categories with at least 3 posts
          )
          .slice(0, 8) // Take top 8 most used categories
          .map((cat) => ({
            id: cat.id,
            name: cat.name,
            slug: cat.slug,
          }));

        if (isMounted) {
          setCategories([ALL_CATEGORY, ...filteredCategories]);
        }
      } catch (err) {
        console.error("Error fetching categories:", err);
        if (isMounted) {
          setError("Failed to load categories");
          // Keep at least the "All" category on error
          setCategories([ALL_CATEGORY]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchCategories();

    return () => {
      isMounted = false;
    };
  }, [publication.apiBaseUrl, publication.id]);

  return { categories, loading, error };
}
