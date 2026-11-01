import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const template = fs.readFileSync(
  path.join(process.cwd(), "server", "templates", "marketing.html"),
  "utf8",
);

const visibleText = template
  .replace(/<style[\s\S]*?<\/style>/g, " ")
  .replace(/<script[\s\S]*?<\/script>/g, " ")
  .replace(/<[^>]+>/g, " ")
  .replace(/&amp;/g, "&")
  .replace(/&mdash;/g, "-")
  .replace(/\s+/g, " ")
  .toLowerCase();

const flaggedPhrases = [
  "accounts unlock",
  "surface the story",
  "unifies",
  "single native experience",
  "more than a reader",
];

for (const phrase of flaggedPhrases) {
  assert.equal(
    visibleText.includes(phrase),
    false,
    `Marketing copy should avoid AI-style phrase: ${phrase}`,
  );
}

assert.equal(
  visibleText.includes("how it works"),
  false,
  "Marketing page should not include the How it works section",
);
assert.equal(
  template.includes('href="#how"'),
  false,
  "Marketing nav should not link to the removed How it works section",
);
assert.equal(
  template.includes('id="how"'),
  false,
  "Marketing page should not keep the removed How it works anchor",
);
