export type HomeStoryVisibilityArticle = {
  id: number;
  publicationId?: string;
};

export const HIDDEN_HOME_STORIES_STORAGE_KEY =
  "@paly_journalism/hidden_home_stories";
export const HOME_STORY_READ_PROGRESS_STORAGE_KEY =
  "@paly_journalism/home_story_read_progress";
export const HOME_STORY_READ_PROGRESS_PRIORITY_THRESHOLD = 50;

export type HomeStoryReadProgressByKey = Record<string, number>;

export function getHomeStoryVisibilityKey(
  article: HomeStoryVisibilityArticle,
  fallbackPublicationId: string,
): string {
  return `${article.publicationId || fallbackPublicationId}:${article.id}`;
}

export function filterVisibleHomeStories<
  TArticle extends HomeStoryVisibilityArticle,
>(
  articles: TArticle[],
  hiddenStoryKeys: ReadonlySet<string>,
  fallbackPublicationId: string,
): TArticle[] {
  if (hiddenStoryKeys.size === 0) {
    return articles;
  }

  return articles.filter(
    (article) =>
      !hiddenStoryKeys.has(
        getHomeStoryVisibilityKey(article, fallbackPublicationId),
      ),
  );
}

export function prioritizeHomeStoriesByReadProgress<
  TArticle extends HomeStoryVisibilityArticle,
>(
  articles: TArticle[],
  readProgressByStoryKey: HomeStoryReadProgressByKey,
  fallbackPublicationId: string,
): TArticle[] {
  const highProgressStories: TArticle[] = [];
  const otherStories: TArticle[] = [];

  for (const article of articles) {
    const progress =
      readProgressByStoryKey[
        getHomeStoryVisibilityKey(article, fallbackPublicationId)
      ] ?? 0;

    if (progress > HOME_STORY_READ_PROGRESS_PRIORITY_THRESHOLD) {
      highProgressStories.push(article);
    } else {
      otherStories.push(article);
    }
  }

  return [...otherStories, ...highProgressStories];
}

export function parseHomeStoryReadProgress(
  stored: string | null,
): HomeStoryReadProgressByKey {
  if (!stored) {
    return {};
  }

  const parsed = JSON.parse(stored);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return {};
  }

  const progressByKey: HomeStoryReadProgressByKey = {};
  for (const [key, value] of Object.entries(parsed)) {
    if (typeof key !== "string" || typeof value !== "number") continue;
    if (!Number.isFinite(value)) continue;

    progressByKey[key] = Math.max(0, Math.min(100, Math.round(value)));
  }

  return progressByKey;
}
