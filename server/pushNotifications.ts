import { wpFetch } from "./wpFetch";
import { PUBLICATION_CONFIGS } from "@shared/publications";
import {
  getExternalFeedArticles,
  getExternalFeedPublicationConfigs,
  isExternalPublicationId,
} from "./externalFeeds";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const DEFAULT_POLL_INTERVAL_MS = 5 * 60 * 1000;

export interface PushArticle {
  id: number;
  date: string;
  link?: string;
  categories: number[];
  title: { rendered: string };
  excerpt?: { rendered: string };
}

export interface PushPublicationConfig {
  id: string;
  name: string;
  domain: string;
  primaryColor: string;
  wpApiBaseUrl?: string;
}

export interface PushTargetPreference {
  expoPushToken: string;
  publicationId: string;
  enabled: boolean;
  categoryIds: number[] | null;
}

export interface PushMessage {
  to: string;
  sound: "default";
  title: string;
  body: string;
  data: {
    articleId: number;
    publicationId: string;
    url?: string;
  };
}

export interface PushSendFailure {
  token: string;
  reason: string;
}

export interface PushNotificationStorage {
  getNotificationFeedState(publicationId: string): Promise<
    | {
        publicationId: string;
        latestArticleId: number;
        latestArticlePublishedAt: Date;
      }
    | undefined
  >;
  upsertNotificationFeedState(
    publicationId: string,
    latestArticleId: number,
    latestArticlePublishedAt: Date,
  ): Promise<void>;
  getPushTargetsForArticle(
    publicationId: string,
    categoryIds: number[],
  ): Promise<PushTargetPreference[]>;
  deletePushNotificationDeviceByToken(token: string): Promise<void>;
}

type FetchArticles = (
  publication: PushPublicationConfig,
) => Promise<PushArticle[]>;
type SendPushMessages = (messages: PushMessage[]) => Promise<PushSendFailure[]>;

export function getPushNotificationPublicationConfigs(): PushPublicationConfig[] {
  return [
    ...PUBLICATION_CONFIGS.map((publication) => ({
      ...publication,
      wpApiBaseUrl: publication.wpApiBaseUrl,
    })),
    ...getExternalFeedPublicationConfigs(),
  ];
}

export function selectPushTargetsForArticle(
  preferences: PushTargetPreference[],
  publicationId: string,
  articleCategoryIds: number[],
): PushTargetPreference[] {
  const seenTokens = new Set<string>();

  return preferences.filter((preference) => {
    if (seenTokens.has(preference.expoPushToken)) return false;
    if (!preference.enabled) return false;
    if (preference.publicationId !== publicationId) return false;

    const categoryIds = preference.categoryIds;
    const matchesCategory =
      !categoryIds ||
      categoryIds.length === 0 ||
      categoryIds.some((id) => articleCategoryIds.includes(id));

    if (!matchesCategory) return false;

    seenTokens.add(preference.expoPushToken);
    return true;
  });
}

export function buildArticlePushMessages({
  article,
  publication,
  targets,
}: {
  article: PushArticle;
  publication: PushPublicationConfig;
  targets: PushTargetPreference[];
}): PushMessage[] {
  const title = stripHtml(article.title.rendered).trim() || "New story";

  return targets.map((target) => ({
    to: target.expoPushToken,
    sound: "default",
    title: publication.name,
    body: title,
    data: {
      articleId: article.id,
      publicationId: publication.id,
      url: article.link,
    },
  }));
}

export async function fetchLatestArticlesForPublication(
  publication: PushPublicationConfig,
): Promise<PushArticle[]> {
  if (!publication.wpApiBaseUrl) {
    if (!isExternalPublicationId(publication.id)) {
      throw new Error(`No feed configured for ${publication.id}`);
    }

    const externalArticles = await getExternalFeedArticles(publication.id);
    return externalArticles.map((article) => ({
      id: article.id,
      date: article.date,
      link: article.link,
      categories: [],
      title: article.title,
      excerpt: article.excerpt,
    }));
  }

  const url = new URL(`${publication.wpApiBaseUrl}/posts`);
  url.searchParams.set("per_page", "10");
  url.searchParams.set("orderby", "date");
  url.searchParams.set("order", "desc");
  url.searchParams.set("_fields", "id,date,link,title,categories");

  const response = await wpFetch(url.toString());
  if (!response.ok) {
    throw new Error(
      `Failed to fetch ${publication.id} posts: ${response.status}`,
    );
  }

  return (await response.json()) as PushArticle[];
}

export async function sendExpoPushMessages(
  messages: PushMessage[],
): Promise<PushSendFailure[]> {
  const failures: PushSendFailure[] = [];

  for (const batch of chunk(messages, 100)) {
    const response = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-Encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(batch),
    });

    if (!response.ok) {
      throw new Error(`Expo push send failed: ${response.status}`);
    }

    const payload = (await response.json()) as {
      data?: Array<{
        status: "ok" | "error";
        message?: string;
        details?: { error?: string };
      }>;
    };

    payload.data?.forEach((ticket, index) => {
      if (ticket.status === "error") {
        failures.push({
          token: batch[index].to,
          reason: ticket.details?.error || ticket.message || "unknown",
        });
      }
    });
  }

  return failures;
}

export async function pollPublicationForPushNotifications({
  publication,
  storage,
  fetchArticles = fetchLatestArticlesForPublication,
  sendPushMessages = sendExpoPushMessages,
}: {
  publication: PushPublicationConfig;
  storage: PushNotificationStorage;
  fetchArticles?: FetchArticles;
  sendPushMessages?: SendPushMessages;
}): Promise<number> {
  const articles = await fetchArticles(publication);
  const sortedArticles = [...articles].sort(compareArticlesByDate);
  const latestArticle = sortedArticles.at(-1);

  if (!latestArticle) return 0;

  const state = await storage.getNotificationFeedState(publication.id);
  if (!state) {
    await storage.upsertNotificationFeedState(
      publication.id,
      latestArticle.id,
      new Date(latestArticle.date),
    );
    return 0;
  }

  const newArticles = sortedArticles.filter(
    (article) => new Date(article.date) > state.latestArticlePublishedAt,
  );
  let sentCount = 0;

  for (const article of newArticles) {
    const targets = await storage.getPushTargetsForArticle(
      publication.id,
      article.categories,
    );
    const messages = buildArticlePushMessages({
      article,
      publication,
      targets,
    });
    if (messages.length === 0) continue;

    const failures = await sendPushMessages(messages);
    sentCount += messages.length - failures.length;

    for (const failure of failures) {
      if (failure.reason === "DeviceNotRegistered") {
        await storage.deletePushNotificationDeviceByToken(failure.token);
      }
    }
  }

  if (new Date(latestArticle.date) > state.latestArticlePublishedAt) {
    await storage.upsertNotificationFeedState(
      publication.id,
      latestArticle.id,
      new Date(latestArticle.date),
    );
  }

  return sentCount;
}

export async function pollAllPublicationsForPushNotifications(
  notificationStorage?: PushNotificationStorage,
): Promise<void> {
  const activeStorage =
    notificationStorage || (await import("./storage")).storage;
  const publications = getPushNotificationPublicationConfigs();
  const results = await Promise.allSettled(
    publications.map((publication) =>
      pollPublicationForPushNotifications({
        publication,
        storage: activeStorage,
      }),
    ),
  );

  results.forEach((result, index) => {
    if (result.status === "rejected") {
      console.error(
        `Push notification poll failed for ${publications[index].id}:`,
        result.reason,
      );
    }
  });
}

export function startPushNotificationPoller({
  intervalMs = Number(
    process.env.PUSH_NOTIFICATION_POLL_INTERVAL_MS || DEFAULT_POLL_INTERVAL_MS,
  ),
  runImmediately = true,
}: {
  intervalMs?: number;
  runImmediately?: boolean;
} = {}) {
  if (process.env.DISABLE_PUSH_NOTIFICATION_POLLER === "true") {
    return { stop: () => {} };
  }

  let running = false;
  const run = async () => {
    if (running) return;
    running = true;
    try {
      await pollAllPublicationsForPushNotifications();
    } finally {
      running = false;
    }
  };

  if (runImmediately) {
    run().catch((error) => {
      console.error("Initial push notification poll failed:", error);
    });
  }

  const timer = setInterval(() => {
    run().catch((error) => {
      console.error("Push notification poll failed:", error);
    });
  }, intervalMs);

  timer.unref?.();

  return {
    stop: () => clearInterval(timer),
  };
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").replace(/\s+/g, " ");
}

function compareArticlesByDate(a: PushArticle, b: PushArticle): number {
  return new Date(a.date).getTime() - new Date(b.date).getTime();
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}
