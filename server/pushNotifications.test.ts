import assert from "node:assert/strict";

import {
  buildArticlePushMessages,
  getPushNotificationPublicationConfigs,
  pollPublicationForPushNotifications,
  selectPushTargetsForArticle,
  type PushArticle,
  type PushMessage,
  type PushNotificationStorage,
} from "./pushNotifications";

assert.deepEqual(
  getPushNotificationPublicationConfigs()
    .filter((publication) => !publication.wpApiBaseUrl)
    .map((publication) => publication.id)
    .sort(),
  ["kply", "proof", "viaverde"],
  "push polling should include non-WordPress feed publications",
);

const publication = {
  id: "palyvoice",
  name: "The Paly Voice",
  domain: "palyvoice.com",
  wpApiBaseUrl: "https://palyvoice.com/wp-json/wp/v2",
  primaryColor: "#000000",
};

const matchingArticle: PushArticle = {
  id: 42,
  date: "2026-06-29T17:00:00.000Z",
  link: "https://palyvoice.com/story",
  categories: [5, 9],
  title: { rendered: "New <em>Story</em>" },
  excerpt: { rendered: "" },
};

const targets = selectPushTargetsForArticle(
  [
    {
      expoPushToken: "ExpoPushToken[all-categories]",
      publicationId: "palyvoice",
      enabled: true,
      categoryIds: null,
    },
    {
      expoPushToken: "ExpoPushToken[matching-category]",
      publicationId: "palyvoice",
      enabled: true,
      categoryIds: [5],
    },
    {
      expoPushToken: "ExpoPushToken[matching-category]",
      publicationId: "palyvoice",
      enabled: true,
      categoryIds: [9],
    },
    {
      expoPushToken: "ExpoPushToken[wrong-category]",
      publicationId: "palyvoice",
      enabled: true,
      categoryIds: [7],
    },
    {
      expoPushToken: "ExpoPushToken[disabled]",
      publicationId: "palyvoice",
      enabled: false,
      categoryIds: [5],
    },
    {
      expoPushToken: "ExpoPushToken[wrong-publication]",
      publicationId: "infocus",
      enabled: true,
      categoryIds: [5],
    },
  ],
  "palyvoice",
  matchingArticle.categories,
);

assert.deepEqual(
  targets.map((target) => target.expoPushToken),
  ["ExpoPushToken[all-categories]", "ExpoPushToken[matching-category]"],
  "push targets should match enabled publication/category preferences once per token",
);

const messages = buildArticlePushMessages({
  article: matchingArticle,
  publication,
  targets,
});

assert.deepEqual(
  messages.map((message) => ({
    to: message.to,
    title: message.title,
    body: message.body,
    data: message.data,
  })),
  [
    {
      to: "ExpoPushToken[all-categories]",
      title: "The Paly Voice",
      body: "New Story",
      data: {
        articleId: 42,
        publicationId: "palyvoice",
        url: "https://palyvoice.com/story",
      },
    },
    {
      to: "ExpoPushToken[matching-category]",
      title: "The Paly Voice",
      body: "New Story",
      data: {
        articleId: 42,
        publicationId: "palyvoice",
        url: "https://palyvoice.com/story",
      },
    },
  ],
  "push messages should be display-ready and route back to the article",
);

const sentMessages: PushMessage[][] = [];
let state:
  | {
      publicationId: string;
      latestArticleId: number;
      latestArticlePublishedAt: Date;
    }
  | undefined;

const storage: PushNotificationStorage = {
  getNotificationFeedState: async () => state,
  upsertNotificationFeedState: async (
    publicationId,
    latestArticleId,
    latestArticlePublishedAt,
  ) => {
    state = { publicationId, latestArticleId, latestArticlePublishedAt };
  },
  getPushTargetsForArticle: async () => targets,
  deletePushNotificationDeviceByToken: async () => {},
};

async function runPollAssertions() {
  await pollPublicationForPushNotifications({
    publication,
    storage,
    fetchArticles: async () => [matchingArticle],
    sendPushMessages: async (batch) => {
      sentMessages.push(batch);
      return [];
    },
  });

  assert.equal(
    sentMessages.length,
    0,
    "first poll should seed state without sending old stories",
  );
  assert.equal(state?.latestArticleId, 42);

  const newerArticle: PushArticle = {
    ...matchingArticle,
    id: 43,
    date: "2026-06-29T18:00:00.000Z",
    link: "https://palyvoice.com/newer-story",
    title: { rendered: "Newer Story" },
  };

  await pollPublicationForPushNotifications({
    publication,
    storage,
    fetchArticles: async () => [newerArticle, matchingArticle],
    sendPushMessages: async (batch) => {
      sentMessages.push(batch);
      return [];
    },
  });

  assert.equal(
    sentMessages.length,
    1,
    "later polls should send push notifications for new stories",
  );
  assert.deepEqual(
    sentMessages[0].map((message) => message.data),
    [
      {
        articleId: 43,
        publicationId: "palyvoice",
        url: "https://palyvoice.com/newer-story",
      },
      {
        articleId: 43,
        publicationId: "palyvoice",
        url: "https://palyvoice.com/newer-story",
      },
    ],
  );
  assert.equal(state?.latestArticleId, 43);
}

runPollAssertions().catch((error) => {
  console.error(error);
  process.exit(1);
});
