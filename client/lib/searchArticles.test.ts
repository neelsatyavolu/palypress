import assert from "node:assert/strict";

import {
  HOME_PUBLICATION,
  PUBLICATIONS,
  WORDPRESS_PUBLICATIONS,
} from "@/constants/publications";
import { Article } from "@/types/article";
import {
  getArticleSearchRequests,
  rankArticleSearchResults,
} from "./searchArticles";

const homeRequests = getArticleSearchRequests(
  HOME_PUBLICATION,
  "student news",
  1,
  10,
);

assert.equal(
  homeRequests.length,
  WORDPRESS_PUBLICATIONS.length,
  "home search should query each WordPress publication",
);

assert.equal(
  homeRequests.some((request) => request.url.startsWith("/posts")),
  false,
  "home search should never create a relative WordPress posts URL",
);

assert.ok(
  homeRequests.every((request) => request.url.startsWith("https://")),
  "home search should use absolute publication API URLs",
);

assert.ok(
  homeRequests.every((request) =>
    request.url.includes("search=student%20news"),
  ),
  "search query should be URL-encoded in every request",
);

assert.ok(
  homeRequests.every((request) => request.url.includes("orderby=relevance")),
  "search requests should ask WordPress for relevance ordering",
);

const palyVoice = PUBLICATIONS.find(
  (publication) => publication.id === "palyvoice",
);
assert.ok(palyVoice, "Paly Voice publication should exist");

const palyVoiceRequests = getArticleSearchRequests(
  palyVoice,
  "bell schedule",
  2,
  10,
);

assert.deepEqual(
  palyVoiceRequests.map((request) => request.publicationId),
  ["palyvoice"],
  "single-publication search should query only the selected publication",
);
assert.ok(
  palyVoiceRequests[0].url.includes("page=2"),
  "single-publication search should preserve pagination",
);

const kply = PUBLICATIONS.find((publication) => publication.id === "kply");
assert.ok(kply, "KPLY publication should exist");

assert.deepEqual(
  getArticleSearchRequests(kply, "podcast", 1, 10),
  [],
  "publications without WordPress APIs should not create article search requests",
);

const archive = PUBLICATIONS.find(
  (publication) => publication.id === "archive",
);
assert.ok(archive, "Paly Journalism Archive publication should exist");

assert.deepEqual(
  getArticleSearchRequests(archive, "football", 1, 10),
  [],
  "archive should not create WordPress search requests",
);

function article(
  id: number,
  title: string,
  excerpt: string,
  content: string,
  author = "Staff",
): Article {
  return {
    id,
    title: { rendered: title },
    excerpt: { rendered: excerpt },
    content: { rendered: content },
    date: "2026-06-29T12:00:00",
    _embedded: {
      "wp:term": [
        [
          {
            id: id + 100,
            name: author,
            slug: author.toLowerCase(),
            taxonomy: "staff_name",
          },
        ],
      ],
    },
  };
}

const weakContentMatch = article(
  1,
  "Boys' soccer celebrates new season with haircuts",
  "To celebrate the beginning of a new season, the team got haircuts.",
  "The roster included Jason Glass among many new players.",
);
const titlePhraseMatch = article(
  2,
  "Jason Glass reflects on student journalism",
  "A conversation about reporting and campus life.",
  "The interview covered newsroom routines.",
);
const authorMatch = article(
  3,
  "New classes shape spring semester",
  "Students adjusted to new routines.",
  "The story covered course selection.",
  "Jason Glass",
);

assert.deepEqual(
  rankArticleSearchResults(
    [weakContentMatch, titlePhraseMatch, authorMatch],
    "jason glass",
  ).map((item) => item.id),
  [2, 3, 1],
  "search ranking should prefer exact title and author matches over weak body mentions",
);
