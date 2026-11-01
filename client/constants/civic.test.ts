import assert from "node:assert/strict";
import { isCivicArticle } from "./civic";
import type { ArticleWithSource } from "../types/article";

function make(partial: Partial<ArticleWithSource>): ArticleWithSource {
  return {
    id: 1,
    title: { rendered: "" },
    excerpt: { rendered: "" },
    content: { rendered: "" },
    date: "2026-01-01",
    publicationId: "palyvoice",
    publicationName: "The Paly Voice",
    publicationColor: "#000",
    ...partial,
  } as ArticleWithSource;
}

// Test 1: matches by keyword in the title
const test1 = make({ title: { rendered: "School Board approves new budget" } });
assert.equal(isCivicArticle(test1), true, "Should match by civic keyword in title");

// Test 2: matches by mapped civic category slug
const test2 = make({ _embedded: { "wp:term": [[{ id: 5, name: "Government", slug: "government", taxonomy: "category" }]] } });
assert.equal(isCivicArticle(test2), true, "Should match by mapped civic category slug");

// Test 3: rejects non-civic articles
const test3 = make({ title: { rendered: "Boys basketball wins final" } });
assert.equal(isCivicArticle(test3), false, "Should reject non-civic articles");

// Test 4: handles missing _embedded and empty excerpt
const test4 = make({});
assert.equal(isCivicArticle(test4), false, "Should handle missing _embedded and empty excerpt");

// Test 5 (regression): "district" alone should not match sports article
const test5 = make({ title: { rendered: "District wins state championship" } });
assert.equal(isCivicArticle(test5), false, "Should not match 'district' alone in sports headline");

// Test 6 (confirmation): "ballot measure" should match civic article
const test6 = make({ title: { rendered: "Voters approve ballot measure" } });
assert.equal(isCivicArticle(test6), true, "Should match 'ballot measure' civic phrase in title");

// Test 7 (regression): a general-news story (e.g. a space mission) filed under
// the broad "news" category must NOT be classified as civic.
const test7 = make({
  title: { rendered: "Artemis II mission prepares for launch" },
  excerpt: { rendered: "NASA's next crewed flight around the Moon nears liftoff." },
  _embedded: { "wp:term": [[{ id: 9, name: "News", slug: "news", taxonomy: "category" }]] },
});
assert.equal(isCivicArticle(test7), false, "Should not classify general news (space mission) as civic");

// Test 8 (local-community): a Palo Alto yard/garage sale is local news even
// though it carries no civic category or keyword. Requires place + signal.
const test8 = make({
  title: { rendered: "Palo Alto to host citywide yard sale" },
  excerpt: { rendered: "Residents across the neighborhood will clear out garages." },
  _embedded: { "wp:term": [[{ id: 9, name: "News", slug: "news", taxonomy: "category" }]] },
});
assert.equal(isCivicArticle(test8), true, "Should match a Palo Alto community yard sale");

// Test 9 (precision guard): a place anchor WITHOUT a community signal must not
// match — otherwise campus features/sports that mention Palo Alto flood in.
const test9 = make({
  title: { rendered: "Girls lacrosse wins CCS championship" },
  excerpt: { rendered: "The Palo Alto team capped an undefeated season." },
});
assert.equal(isCivicArticle(test9), false, "Should not match a sports story that only mentions the city");

// Test 10 (precision guard): a community signal WITHOUT a place anchor must not
// match — a club fundraiser garage sale is not local news.
const test10 = make({
  title: { rendered: "Badminton team hosts garage sale fundraiser" },
});
assert.equal(isCivicArticle(test10), false, "Should not match a community signal without a local place anchor");

// Test 11 (local-community): an East Palo Alto affordable housing opening.
const test11 = make({
  title: { rendered: "EPA opens new affordable housing complex" },
});
assert.equal(isCivicArticle(test11), true, "Should match an East Palo Alto affordable housing story");

console.log("All tests passed!");
