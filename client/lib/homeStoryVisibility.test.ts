import assert from "node:assert/strict";

import {
  filterVisibleHomeStories,
  getHomeStoryVisibilityKey,
  prioritizeHomeStoriesByReadProgress,
} from "./homeStoryVisibility";

const voiceStory = {
  id: 42,
  title: { rendered: "Voice story" },
  publicationId: "palyvoice",
};

const campanileStory = {
  id: 42,
  title: { rendered: "Campanile story" },
  publicationId: "campanile",
};

const singlePublicationStory = {
  id: 10,
  title: { rendered: "Single publication story" },
};

assert.equal(
  getHomeStoryVisibilityKey(voiceStory, "fallback"),
  "palyvoice:42",
  "story keys should prefer the source publication id",
);

assert.equal(
  getHomeStoryVisibilityKey(singlePublicationStory, "palyvoice"),
  "palyvoice:10",
  "story keys should use the current publication when no source is attached",
);

assert.deepEqual(
  filterVisibleHomeStories(
    [voiceStory, campanileStory, singlePublicationStory],
    new Set(["palyvoice:42", "palyvoice:10"]),
    "palyvoice",
  ).map((article) => article.title.rendered),
  ["Campanile story"],
  "hidden stories should be filtered without hiding matching ids from other publications",
);

assert.deepEqual(
  prioritizeHomeStoriesByReadProgress(
    [voiceStory, campanileStory, singlePublicationStory],
    {
      "palyvoice:42": 51,
      "campanile:42": 50,
      "palyvoice:10": 72,
    },
    "palyvoice",
  ).map((article) => article.title.rendered),
  ["Campanile story", "Voice story", "Single publication story"],
  "stories read more than 50% should move below unread and exactly-half-read stories",
);
