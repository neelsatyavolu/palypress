import PostHog from "posthog-react-native";
import {
  buildArticleEngagementProperties,
  type ArticleEngagementInput,
  type ArticleTrafficSource,
} from "@/lib/analyticsEvents";

/**
 * Thin, typed wrapper around PostHog for product analytics.
 *
 * Design notes (see docs/superpowers/specs/2026-05-28-analytics-design.md):
 * - Tracks everyone: PostHog auto-generates an anonymous device id, so
 *   not-logged-in readers are counted. On login we `identify` to stitch the
 *   anonymous history to the account; on logout we `reset`.
 * - Degrades to a no-op when PostHog env config is absent (e.g. local dev /
 *   Expo Go without analytics configured), so nothing throws.
 * - Every call is wrapped so analytics can never crash a user flow.
 */

const POSTHOG_KEY =
  process.env.EXPO_PUBLIC_POSTHOG_KEY?.trim() ||
  process.env.EXPO_PUBLIC_POSTHOG_API_KEY?.trim();
const POSTHOG_HOST =
  process.env.EXPO_PUBLIC_POSTHOG_HOST?.trim() || "https://us.i.posthog.com";

const posthog: PostHog | null = POSTHOG_KEY
  ? new PostHog(POSTHOG_KEY, { host: POSTHOG_HOST })
  : null;

/** True when analytics is configured. Useful for the PostHogProvider in App. */
export const analyticsEnabled = posthog !== null;

/** Underlying client (or null). Prefer the typed helpers below. */
export const posthogClient = posthog;

function safe(run: (client: PostHog) => void): void {
  if (!posthog) return;
  try {
    run(posthog);
  } catch (error) {
    console.error("Analytics call failed:", error);
  }
}

/** Link the current anonymous session to a signed-in account. */
export function identifyUser(userId: string, email?: string | null): void {
  safe((client) => client.identify(userId, email ? { email } : undefined));
}

/** Detach the current session from an account (call on sign out). */
export function resetUser(): void {
  safe((client) => client.reset());
}

/** Fired when a new account is created (mirrors the Postgres count as a trend). */
export function trackAccountCreated(userId: string): void {
  safe((client) => client.capture("account_created", { user_id: userId }));
}

/** Fired when an article has been on screen long enough to count as a read. */
export function trackArticleViewed(params: {
  articleId: string | number;
  title?: string;
  publication?: string;
  source?: ArticleTrafficSource;
  sourceDetail?: string;
}): void {
  const properties: Record<string, string> = {
    article_id: String(params.articleId),
  };
  if (params.title) properties.title = params.title;
  if (params.publication) properties.publication = params.publication;
  if (params.source) properties.source = params.source;
  if (params.sourceDetail) properties.source_detail = params.sourceDetail;
  safe((client) => client.capture("article_viewed", properties));
}

/** Fired when an article card is visible in a feed/search surface. */
export function trackArticleImpression(params: {
  articleId: string | number;
  title?: string;
  publication?: string;
  source: ArticleTrafficSource;
  sourceDetail?: string;
  position?: number;
}): void {
  const properties: Record<string, string | number> = {
    article_id: String(params.articleId),
    source: params.source,
  };
  if (params.title) properties.title = params.title;
  if (params.publication) properties.publication = params.publication;
  if (params.sourceDetail) properties.source_detail = params.sourceDetail;
  if (params.position !== undefined) properties.position = params.position;
  safe((client) => client.capture("article_impression", properties));
}

/** Fired immediately when a user opens an article. Useful with impressions for CTR. */
export function trackArticleOpened(params: {
  articleId: string | number;
  title?: string;
  publication?: string;
  source?: ArticleTrafficSource;
  sourceDetail?: string;
}): void {
  const properties: Record<string, string> = {
    article_id: String(params.articleId),
  };
  if (params.title) properties.title = params.title;
  if (params.publication) properties.publication = params.publication;
  if (params.source) properties.source = params.source;
  if (params.sourceDetail) properties.source_detail = params.sourceDetail;
  safe((client) => client.capture("article_opened", properties));
}

/** Fired when leaving an article, with duration and deepest read point. */
export function trackArticleEngagement(params: ArticleEngagementInput): void {
  safe((client) =>
    client.capture(
      "article_engagement",
      buildArticleEngagementProperties(params),
    ),
  );
}

/** Fired once when a user reaches the completion threshold for an article. */
export function trackArticleReadCompleted(
  params: ArticleEngagementInput,
): void {
  safe((client) =>
    client.capture(
      "article_read_completed",
      buildArticleEngagementProperties({ ...params, completed: true }),
    ),
  );
}

/**
 * Fired when an ad becomes visible. No ad system exists yet — this is the
 * tracking contract, ready to be called once ads ship.
 */
export function trackAdViewed(params: {
  adId: string | number;
  placement?: string;
}): void {
  const properties: Record<string, string> = { ad_id: String(params.adId) };
  if (params.placement) properties.placement = params.placement;
  safe((client) => client.capture("ad_viewed", properties));
}

/** Fired when a user successfully signs in. */
export function trackSignedIn(params: {
  authMethod: "google" | "apple" | "email";
  isNewUser?: boolean;
}): void {
  safe((client) =>
    client.capture("user_signed_in", {
      auth_method: params.authMethod,
      is_new_user: params.isNewUser ?? false,
    }),
  );
}

/** Fired when a user explicitly signs out. */
export function trackSignedOut(): void {
  safe((client) => client.capture("user_signed_out"));
}

/** Fired when a user switches the active publication/feed. */
export function trackPublicationSelected(params: {
  fromPublicationId?: string;
  fromPublicationName?: string;
  toPublicationId: string;
  toPublicationName: string;
}): void {
  const properties: Record<string, string> = {
    to_publication_id: params.toPublicationId,
    to_publication_name: params.toPublicationName,
  };
  if (params.fromPublicationId) {
    properties.from_publication_id = params.fromPublicationId;
  }
  if (params.fromPublicationName) {
    properties.from_publication_name = params.fromPublicationName;
  }
  safe((client) => client.capture("publication_selected", properties));
}

export function trackNotificationPermission(params: {
  status: "registered" | "denied" | "skipped" | "error";
  platform?: string;
  reason?: string;
}): void {
  const properties: Record<string, string> = { status: params.status };
  if (params.platform) properties.platform = params.platform;
  if (params.reason) properties.reason = params.reason;
  safe((client) =>
    client.capture("notification_permission_result", properties),
  );
}

export function trackNotificationPreferenceUpdated(params: {
  publicationId: string;
  enabled: boolean;
  categoryCount?: number;
}): void {
  safe((client) =>
    client.capture("notification_preference_updated", {
      publication_id: params.publicationId,
      enabled: params.enabled,
      category_count: params.categoryCount ?? 0,
    }),
  );
}

export function trackNotificationOpened(
  params: {
    notificationId?: string;
    articleId?: string | number;
    publicationId?: string;
  } = {},
): void {
  const properties: Record<string, string> = {};
  if (params.notificationId) properties.notification_id = params.notificationId;
  if (params.articleId !== undefined) {
    properties.article_id = String(params.articleId);
  }
  if (params.publicationId) properties.publication_id = params.publicationId;
  safe((client) => client.capture("notification_opened", properties));
}

/** Fired when a user saves an article for later. */
export function trackArticleSaved(params: {
  articleId: string | number;
  title?: string;
  publication?: string;
}): void {
  const properties: Record<string, string | number> = {
    article_id: String(params.articleId),
  };
  if (params.title) properties.title = params.title;
  if (params.publication) properties.publication = params.publication;
  safe((client) => client.capture("article_saved", properties));
}

/** Fired when a user removes a saved article. */
export function trackArticleUnsaved(params: {
  articleId: string | number;
  title?: string;
  publication?: string;
}): void {
  const properties: Record<string, string | number> = {
    article_id: String(params.articleId),
  };
  if (params.title) properties.title = params.title;
  if (params.publication) properties.publication = params.publication;
  safe((client) => client.capture("article_unsaved", properties));
}

/** Fired when a user successfully posts a comment. */
export function trackCommentSubmitted(params: {
  articleId: string | number;
  articleTitle?: string;
  isReply?: boolean;
}): void {
  const properties: Record<string, string | boolean> = {
    article_id: String(params.articleId),
    is_reply: params.isReply ?? false,
  };
  if (params.articleTitle) properties.article_title = params.articleTitle;
  safe((client) => client.capture("comment_submitted", properties));
}

/** Fired when a debounced search query executes. */
export function trackSearchPerformed(params: {
  query: string;
  resultCount?: number;
  publication?: string;
}): void {
  const properties: Record<string, string | number> = {
    query: params.query,
    result_count: params.resultCount ?? 0,
  };
  if (params.publication) properties.publication = params.publication;
  safe((client) => client.capture("search_performed", properties));
}

/** Fired when a user successfully updates their display name. */
export function trackProfileUpdated(): void {
  safe((client) =>
    client.capture("profile_updated", { field: "display_name" }),
  );
}
