import assert from "node:assert/strict";

import {
  buildWeeklyDigest,
  getMostRecentDigestBoundary,
  runWeeklyDigestIfDue,
  type WeeklyDigestStorage,
} from "./weeklyDigest";
import type { DigestStory } from "./email";

const DAY_MS = 24 * 60 * 60 * 1000;

function pacificPartsOf(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value;
  return {
    weekday: get("weekday"),
    hour: Number(get("hour")),
    minute: Number(get("minute")),
  };
}

// The boundary is always Monday 8:00am Pacific, and never later than `now`.
for (const now of [
  new Date("2026-06-30T12:00:00.000Z"), // Tuesday in Pacific
  new Date("2026-06-29T06:00:00.000Z"), // Monday, before 8am Pacific
  new Date("2026-06-29T15:00:00.000Z"), // Monday, at/after 8am Pacific
  new Date("2026-07-05T23:00:00.000Z"), // Sunday
]) {
  const boundary = getMostRecentDigestBoundary(now);
  const parts = pacificPartsOf(boundary);

  assert.equal(
    parts.weekday,
    "Mon",
    `boundary for ${now.toISOString()} should be a Monday`,
  );
  assert.equal(
    parts.hour,
    8,
    `boundary for ${now.toISOString()} should be 8am Pacific`,
  );
  assert.equal(parts.minute, 0);
  assert.ok(
    boundary.getTime() <= now.getTime(),
    "boundary must not be in the future",
  );
  assert.ok(
    now.getTime() - boundary.getTime() < 7 * DAY_MS,
    "boundary should be the most recent Monday, not an older one",
  );
}

// The boundary is idempotent right at the instant it names, and steps back exactly
// one week just before it.
const boundary = getMostRecentDigestBoundary(
  new Date("2026-06-30T12:00:00.000Z"),
);
assert.equal(
  getMostRecentDigestBoundary(boundary).getTime(),
  boundary.getTime(),
);
assert.equal(
  getMostRecentDigestBoundary(new Date(boundary.getTime() - 1)).getTime(),
  boundary.getTime() - 7 * DAY_MS,
);

// --- buildWeeklyDigest -------------------------------------------------

function makeStorage(
  overrides: Partial<WeeklyDigestStorage>,
): WeeklyDigestStorage {
  return {
    getTopUpvotedArticles: async () => [],
    getUsersForWeeklyDigest: async () => [],
    getWeeklyDigestState: async () => undefined,
    setWeeklyDigestLastSentAt: async () => {},
    ...overrides,
  };
}

function jsonResponse(body: unknown, ok = true): Response {
  return {
    ok,
    status: ok ? 200 : 404,
    json: async () => body,
  } as Response;
}

async function withMockedFetch<T>(
  handler: (url: string) => Response,
  run: () => Promise<T>,
): Promise<T> {
  const original = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL) =>
    handler(String(input))) as typeof fetch;
  try {
    return await run();
  } finally {
    globalThis.fetch = original;
  }
}

async function runAsyncAssertions() {
  {
    const storage = makeStorage({ getTopUpvotedArticles: async () => [] });
    const digest = await buildWeeklyDigest({
      storage,
      boundary: new Date("2026-06-29T15:00:00.000Z"),
    });
    assert.equal(digest, null, "no upvoted articles should skip the digest");
  }

  {
    const storage = makeStorage({
      getTopUpvotedArticles: async () => [
        { articleId: 101, publicationId: "palyvoice", count: 5 },
        { articleId: 202, publicationId: "verde", count: 3 },
        { articleId: 303, publicationId: "campanile", count: 1 }, // will 404
      ],
    });

    const digest = await withMockedFetch(
      (url) => {
        if (url.includes("palyvoice.com/wp-json/wp/v2/posts/101")) {
          return jsonResponse({
            id: 101,
            link: "https://palyvoice.com/story",
            title: { rendered: "Inside the <em>newsroom</em>" },
            excerpt: { rendered: "Excerpt" },
            content: { rendered: `<p>${"word ".repeat(400)}</p>` },
            _embedded: {
              author: [{ name: "Maya Chen" }],
              "wp:featuredmedia": [
                { source_url: "https://palyvoice.com/image.jpg" },
              ],
              "wp:term": [[{ id: 1, name: "Features", taxonomy: "category" }]],
            },
          });
        }
        if (url.includes("verdemagazine.com/wp-json/wp/v2/posts/202")) {
          return jsonResponse({
            id: 202,
            link: "https://verdemagazine.com/story",
            title: { rendered: "Senior thesis show" },
            excerpt: { rendered: "Excerpt" },
            content: { rendered: `<p>${"word ".repeat(100)}</p>` },
            _embedded: {},
          });
        }
        if (url.includes("thecampanile.org/wp-json/wp/v2/posts/303")) {
          return jsonResponse({}, false);
        }
        throw new Error(`Unexpected fetch: ${url}`);
      },
      () =>
        buildWeeklyDigest({
          storage,
          boundary: new Date("2026-06-29T15:00:00.000Z"),
        }),
    );

    assert.ok(
      digest,
      "digest should be built when at least one article resolves",
    );
    assert.equal(
      digest!.stories.length,
      2,
      "the 404'd article should be dropped, not thrown",
    );

    const [first, second] = digest!.stories;
    assert.equal(first.title, "Inside the newsroom");
    assert.equal(first.author, "Maya Chen");
    assert.equal(first.categoryName, "Features");
    assert.equal(first.imageUrl, "https://palyvoice.com/image.jpg");
    assert.equal(first.upvotes, 5);
    assert.equal(
      first.readTimeMinutes,
      2,
      "~400 words at 200wpm rounds to 2 minutes",
    );

    assert.equal(second.title, "Senior thesis show");
    assert.equal(second.author, null);
    assert.equal(second.imageUrl, null);
    assert.equal(second.upvotes, 3);
  }

  // --- runWeeklyDigestIfDue -----------------------------------------------

  {
    const sentTo: string[] = [];
    let lastSentAt: Date | null = null;

    const storage = makeStorage({
      getWeeklyDigestState: async () =>
        lastSentAt ? { lastSentAt } : undefined,
      setWeeklyDigestLastSentAt: async (date) => {
        lastSentAt = date;
      },
      getUsersForWeeklyDigest: async () => [
        { id: "u1", email: "a@example.com" },
        { id: "u2", email: "b@example.com" },
      ],
    });

    const stubStory: DigestStory = {
      publicationName: "The Paly Voice",
      publicationColor: "#000000",
      categoryName: null,
      title: "Story",
      author: null,
      readTimeMinutes: 2,
      upvotes: 5,
      imageUrl: null,
      url: "https://palyvoice.com/story",
    };

    const now = new Date("2026-06-29T15:00:00.000Z");

    const result = await runWeeklyDigestIfDue({
      storage,
      now,
      buildDigest: async () => ({
        weekRangeLabel: "Week of June 22 – 28, 2026",
        stories: [stubStory],
      }),
      sendEmail: async ({ to }) => {
        sentTo.push(to);
        return { success: true };
      },
    });

    assert.equal(result.sent, true);
    assert.equal(result.recipientCount, 2);
    assert.deepEqual(sentTo.sort(), ["a@example.com", "b@example.com"]);
    assert.ok(lastSentAt, "lastSentAt should be recorded");

    // Running again in the same week should be a no-op.
    sentTo.length = 0;
    const secondResult = await runWeeklyDigestIfDue({
      storage,
      now: new Date(now.getTime() + 60 * 60 * 1000),
      buildDigest: async () => ({
        weekRangeLabel: "unused",
        stories: [stubStory],
      }),
      sendEmail: async ({ to }) => {
        sentTo.push(to);
        return { success: true };
      },
    });

    assert.equal(secondResult.sent, false);
    assert.equal(secondResult.recipientCount, 0);
    assert.deepEqual(sentTo, []);
  }

  {
    // Zero-story weeks are skipped but still recorded, so we don't keep
    // rebuilding the digest every hour for the rest of the week.
    let lastSentAt: Date | null = null;
    const storage = makeStorage({
      getWeeklyDigestState: async () =>
        lastSentAt ? { lastSentAt } : undefined,
      setWeeklyDigestLastSentAt: async (date) => {
        lastSentAt = date;
      },
    });

    const result = await runWeeklyDigestIfDue({
      storage,
      now: new Date("2026-06-29T15:00:00.000Z"),
      buildDigest: async () => null,
      sendEmail: async () => ({ success: true }),
    });

    assert.equal(result.sent, false);
    assert.ok(
      lastSentAt,
      "lastSentAt should still be recorded for an empty week",
    );
  }
}

runAsyncAssertions().catch((error) => {
  console.error(error);
  process.exit(1);
});
