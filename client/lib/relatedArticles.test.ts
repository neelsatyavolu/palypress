import assert from "node:assert/strict";

import { HOME_PUBLICATION, PUBLICATIONS } from "@/constants/publications";
import type { Article, ArticleWithSource } from "@/types/article";
import {
  getArticlePublicationId,
  getRelatedArticlesUrl,
} from "./relatedArticles";

const article: Article = {
  id: 12,
  title: { rendered: "Story" },
  excerpt: { rendered: "Excerpt" },
  content: { rendered: "Content" },
  date: "2026-06-29T12:00:00",
  _embedded: {
    "wp:term": [
      [{ id: 7, name: "News", slug: "news", taxonomy: "category" }],
    ],
  },
};

const sourcedArticle: ArticleWithSource = {
  ...article,
  publicationId: "campanile",
  publicationName: "Campanile",
  publicationColor: "#1D3557",
};

const palyVoice = PUBLICATIONS.find(
  (publication) => publication.id === "palyvoice",
);
assert.ok(palyVoice, "Paly Voice publication should exist");

assert.equal(
  getArticlePublicationId(sourcedArticle),
  "campanile",
  "article source publication should be used when route params omit publicationId",
);

assert.equal(
  getArticlePublicationId(sourcedArticle, "palyvoice"),
  "palyvoice",
  "route publicationId should take precedence over the article source",
);

assert.equal(
  getRelatedArticlesUrl(article, HOME_PUBLICATION),
  null,
  "home publication should not produce a relative posts URL",
);

assert.equal(
  getRelatedArticlesUrl(article, palyVoice),
  "https://palyvoice.com/wp-json/wp/v2/posts?_embed&categories=7&per_page=3&exclude=12",
  "related articles should use the source publication WordPress API URL",
);

assert.equal(
  getRelatedArticlesUrl({ ...article, _embedded: undefined }, palyVoice),
  null,
  "articles without categories should not fetch related articles",
);
