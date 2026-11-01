import assert from "node:assert/strict";

import { getWeeklyDigestEmailTemplate, type DigestStory } from "./email";

function story(overrides: Partial<DigestStory>): DigestStory {
  return {
    publicationName: "Verde Magazine",
    publicationColor: "#2D6A4F",
    categoryName: "Features",
    title: "Inside the newsroom",
    author: "Maya Chen",
    readTimeMinutes: 4,
    upvotes: 128,
    imageUrl: null,
    url: "https://verdemagazine.com/story",
    ...overrides,
  };
}

// A story with a real featured image renders an <img>, not the gradient placeholder.
{
  const html = getWeeklyDigestEmailTemplate({
    weekRangeLabel: "Week of June 29 – July 5, 2026",
    stories: [story({ imageUrl: "https://verdemagazine.com/photo.jpg" })],
  });

  assert.match(html, /<img src="https:\/\/verdemagazine\.com\/photo\.jpg"/);
  assert.doesNotMatch(html, /linear-gradient/);
}

// A story with no featured image falls back to the publication-colored gradient tile.
{
  const html = getWeeklyDigestEmailTemplate({
    weekRangeLabel: "Week of June 29 – July 5, 2026",
    stories: [story({ imageUrl: null })],
  });

  assert.doesNotMatch(html, /<img src=/);
  assert.match(html, /linear-gradient\(135deg, #2D6A4F22, #2D6A4F0d\)/);
}

// Byline omits the author segment when the source has none (e.g. podcast/issue feeds).
{
  const html = getWeeklyDigestEmailTemplate({
    weekRangeLabel: "Week of June 29 – July 5, 2026",
    stories: [story({ author: null })],
  });

  assert.doesNotMatch(html, />By /);
  assert.match(html, /4 min read · 128 upvotes/);
}

// User-provided article titles/URLs are HTML-escaped.
{
  const html = getWeeklyDigestEmailTemplate({
    weekRangeLabel: "Week of June 29 – July 5, 2026",
    stories: [story({ title: `<script>alert("x")</script>` })],
  });

  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /&lt;script&gt;/);
}
