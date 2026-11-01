import assert from "node:assert/strict";

import { getArticleSharePayload } from "./articleSharing";

const payload = getArticleSharePayload({
  articleId: 123,
  headline: "Student paper launches app",
  publicationId: "palyvoice",
});

assert.equal(
  payload.url,
  "https://palyjournalism.com/app/article/palyvoice/123",
  "article shares should fall back to the app universal link when no direct URL is available",
);

assert.equal(
  payload.message,
  "Student paper launches app\n\nhttps://palyjournalism.com/app/article/palyvoice/123",
  "share message should include the app universal link when no direct URL is available",
);

const directPayload = getArticleSharePayload({
  articleId: 123,
  headline: "Student paper launches app",
  publicationId: "palyvoice",
  articleUrl: "https://palyvoice.com/2026/07/student-paper-launches-app/",
});

assert.equal(
  directPayload.url,
  "https://palyvoice.com/2026/07/student-paper-launches-app/",
  "article shares should use the direct article link when available",
);

assert.equal(
  directPayload.message,
  "Student paper launches app\n\nhttps://palyvoice.com/2026/07/student-paper-launches-app/",
  "share message should include the direct article link when available",
);

// A blank/whitespace direct URL should fall back to the app universal link.
const blankUrlPayload = getArticleSharePayload({
  articleId: 123,
  headline: "Student paper launches app",
  publicationId: "palyvoice",
  articleUrl: "   ",
});

assert.equal(
  blankUrlPayload.url,
  "https://palyjournalism.com/app/article/palyvoice/123",
  "a blank direct URL should fall back to the app universal link",
);
