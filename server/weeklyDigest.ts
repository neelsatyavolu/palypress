import { getPushNotificationPublicationConfigs } from "./pushNotifications";
import {
  getExternalFeedArticles,
  isExternalPublicationId,
} from "./externalFeeds";
import { sendWeeklyDigestEmail, type DigestStory } from "./email";
import { wpFetch } from "./wpFetch";

const DIGEST_TIMEZONE = "America/Los_Angeles";
const DIGEST_WEEKDAY = 1; // Monday
const DIGEST_HOUR = 8;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export type { DigestStory };

export interface WeeklyDigestStorage {
  getTopUpvotedArticles(
    since: Date,
    limit: number,
  ): Promise<{ articleId: number; publicationId: string; count: number }[]>;
  getUsersForWeeklyDigest(): Promise<{ id: string; email: string }[]>;
  getWeeklyDigestState(): Promise<{ lastSentAt: Date | null } | undefined>;
  setWeeklyDigestLastSentAt(lastSentAt: Date): Promise<void>;
}

interface WPEmbedded {
  author?: { name: string }[];
  "wp:featuredmedia"?: { source_url: string }[];
  "wp:term"?: { id: number; name: string; taxonomy: string }[][];
}

interface WPPost {
  id: number;
  link: string;
  title: { rendered: string };
  excerpt: { rendered: string };
  content?: { rendered: string };
  _embedded?: WPEmbedded;
}

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

function getTimeZoneOffsetMinutes(date: Date, timeZone: string): number {
  const offsetPart = new Intl.DateTimeFormat("en-US", {
    timeZone,
    timeZoneName: "shortOffset",
  })
    .formatToParts(date)
    .find((part) => part.type === "timeZoneName")?.value;

  const match = offsetPart?.match(/GMT([+-]\d+)(?::(\d+))?/);
  if (!match) return 0;

  const hours = parseInt(match[1], 10);
  const minutes = match[2] ? parseInt(match[2], 10) : 0;
  return hours * 60 + (hours < 0 ? -minutes : minutes);
}

function getZonedDateParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  }).formatToParts(date);
  const get = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    weekday: get("weekday"),
  };
}

// Most recent Monday 8am Pacific at or before `now`.
export function getMostRecentDigestBoundary(now: Date): Date {
  const { year, month, day, weekday } = getZonedDateParts(now, DIGEST_TIMEZONE);
  const daysSinceMonday = (WEEKDAY_INDEX[weekday] - DIGEST_WEEKDAY + 7) % 7;

  const naiveUtc = Date.UTC(
    year,
    month - 1,
    day - daysSinceMonday,
    DIGEST_HOUR,
    0,
    0,
  );
  const offsetMinutes = getTimeZoneOffsetMinutes(
    new Date(naiveUtc),
    DIGEST_TIMEZONE,
  );
  let boundary = new Date(naiveUtc - offsetMinutes * 60 * 1000);

  if (boundary.getTime() > now.getTime()) {
    boundary = new Date(boundary.getTime() - WEEK_MS);
  }

  return boundary;
}

function formatWeekRangeLabel(mondayBoundary: Date): string {
  const sunday = new Date(mondayBoundary.getTime() + 6 * 24 * 60 * 60 * 1000);
  const startFmt = new Intl.DateTimeFormat("en-US", {
    timeZone: DIGEST_TIMEZONE,
    month: "long",
    day: "numeric",
  });
  const endFmt = new Intl.DateTimeFormat("en-US", {
    timeZone: DIGEST_TIMEZONE,
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  return `Week of ${startFmt.format(mondayBoundary)} – ${endFmt.format(sunday)}`;
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function estimateReadTimeMinutes(html: string): number {
  const wordCount = stripHtml(html).split(" ").filter(Boolean).length;
  return Math.max(1, Math.round(wordCount / 200));
}

async function fetchWordPressPost(
  wpApiBaseUrl: string,
  articleId: number,
): Promise<WPPost | null> {
  const response = await wpFetch(`${wpApiBaseUrl}/posts/${articleId}?_embed`);
  if (!response.ok) return null;
  return (await response.json()) as WPPost;
}

async function fetchStoryDetails(
  row: { articleId: number; publicationId: string; count: number },
  publications: ReturnType<typeof getPushNotificationPublicationConfigs>,
): Promise<DigestStory | null> {
  const publication = publications.find((p) => p.id === row.publicationId);
  if (!publication) return null;

  if (!publication.wpApiBaseUrl) {
    if (!isExternalPublicationId(publication.id)) return null;
    const articles = await getExternalFeedArticles(publication.id);
    const article = articles.find((a) => a.id === row.articleId);
    if (!article) return null;

    return {
      publicationName: publication.name,
      publicationColor: publication.primaryColor,
      categoryName: article._embedded?.["wp:term"]?.[0]?.[0]?.name ?? null,
      title: stripHtml(article.title.rendered),
      author: null,
      readTimeMinutes: estimateReadTimeMinutes(article.content.rendered),
      upvotes: row.count,
      imageUrl:
        article._embedded?.["wp:featuredmedia"]?.[0]?.source_url ?? null,
      url: article.link,
    };
  }

  const post = await fetchWordPressPost(
    publication.wpApiBaseUrl,
    row.articleId,
  );
  if (!post) return null;

  return {
    publicationName: publication.name,
    publicationColor: publication.primaryColor,
    categoryName: post._embedded?.["wp:term"]?.[0]?.[0]?.name ?? null,
    title: stripHtml(post.title.rendered),
    author: post._embedded?.author?.[0]?.name ?? null,
    readTimeMinutes: estimateReadTimeMinutes(
      post.content?.rendered ?? post.excerpt.rendered,
    ),
    upvotes: row.count,
    imageUrl: post._embedded?.["wp:featuredmedia"]?.[0]?.source_url ?? null,
    url: post.link,
  };
}

export async function buildWeeklyDigest({
  storage,
  boundary,
  limit = 5,
}: {
  storage: WeeklyDigestStorage;
  boundary: Date;
  limit?: number;
}): Promise<{ weekRangeLabel: string; stories: DigestStory[] } | null> {
  const since = new Date(boundary.getTime() - WEEK_MS);
  const top = await storage.getTopUpvotedArticles(since, limit);
  if (top.length === 0) return null;

  const publications = getPushNotificationPublicationConfigs();
  const settled = await Promise.allSettled(
    top.map((row) => fetchStoryDetails(row, publications)),
  );

  const stories = settled
    .filter(
      (result): result is PromiseFulfilledResult<DigestStory | null> =>
        result.status === "fulfilled",
    )
    .map((result) => result.value)
    .filter((story): story is DigestStory => story !== null);

  if (stories.length === 0) return null;

  return { weekRangeLabel: formatWeekRangeLabel(since), stories };
}

export async function runWeeklyDigestIfDue({
  storage,
  now = new Date(),
  buildDigest = buildWeeklyDigest,
  sendEmail = sendWeeklyDigestEmail,
}: {
  storage: WeeklyDigestStorage;
  now?: Date;
  buildDigest?: typeof buildWeeklyDigest;
  sendEmail?: typeof sendWeeklyDigestEmail;
}): Promise<{ sent: boolean; recipientCount: number }> {
  const boundary = getMostRecentDigestBoundary(now);
  const state = await storage.getWeeklyDigestState();

  if (state?.lastSentAt && state.lastSentAt.getTime() >= boundary.getTime()) {
    return { sent: false, recipientCount: 0 };
  }

  const digest = await buildDigest({ storage, boundary });
  if (!digest) {
    await storage.setWeeklyDigestLastSentAt(now);
    return { sent: false, recipientCount: 0 };
  }

  const recipients = await storage.getUsersForWeeklyDigest();
  await Promise.allSettled(
    recipients.map((user) =>
      sendEmail({
        to: user.email,
        weekRangeLabel: digest.weekRangeLabel,
        stories: digest.stories,
      }),
    ),
  );

  await storage.setWeeklyDigestLastSentAt(now);
  return { sent: true, recipientCount: recipients.length };
}

export function startWeeklyDigestScheduler({
  intervalMs = 60 * 60 * 1000,
  runImmediately = true,
}: {
  intervalMs?: number;
  runImmediately?: boolean;
} = {}) {
  if (process.env.DISABLE_WEEKLY_DIGEST_SCHEDULER === "true") {
    return { stop: () => {} };
  }

  let running = false;
  const run = async () => {
    if (running) return;
    running = true;
    try {
      const { storage } = await import("./storage");
      await runWeeklyDigestIfDue({ storage });
    } finally {
      running = false;
    }
  };

  if (runImmediately) {
    run().catch((error) => {
      console.error("Initial weekly digest check failed:", error);
    });
  }

  const timer = setInterval(() => {
    run().catch((error) => {
      console.error("Weekly digest check failed:", error);
    });
  }, intervalMs);

  timer.unref?.();

  return {
    stop: () => clearInterval(timer),
  };
}
