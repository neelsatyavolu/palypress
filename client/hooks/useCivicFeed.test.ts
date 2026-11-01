import { readFileSync } from "fs";
import { resolve } from "path";

const hookPath = resolve(__dirname, "useCivicFeed.ts");
const hookSource = readFileSync(hookPath, "utf-8");

// Test 1: Imports useUnifiedFeed
if (!hookSource.includes('import { useUnifiedFeed } from "./useUnifiedFeed"')) {
  console.error("FAIL: useUnifiedFeed import not found");
  process.exit(1);
}
console.log("PASS: useUnifiedFeed import found");

// Test 2: Imports isCivicArticle
if (!hookSource.includes('import { isCivicArticle } from "@/constants/civic"')) {
  console.error("FAIL: isCivicArticle import not found");
  process.exit(1);
}
console.log("PASS: isCivicArticle import found");

// Test 3: Uses useUnifiedFeed()
if (!hookSource.match(/const\s+feed\s*=\s*useUnifiedFeed\(\)/)) {
  console.error("FAIL: useUnifiedFeed() call not found");
  process.exit(1);
}
console.log("PASS: useUnifiedFeed() call found");

// Test 4: Filters feed.articles using isCivicArticle
if (
  !hookSource.match(/feed\.articles\.filter\(/) ||
  !hookSource.includes("isCivicArticle(article)")
) {
  console.error("FAIL: feed.articles filtered via isCivicArticle not found");
  process.exit(1);
}
console.log("PASS: feed.articles filtered via isCivicArticle found");

// Test 4b: De-duplicates by composite key to avoid duplicate React keys
if (
  !hookSource.includes("new Set<string>()") ||
  !hookSource.includes("${article.publicationId}-${article.id}") ||
  !hookSource.match(/seen\.(has|add)\(/)
) {
  console.error("FAIL: composite-key de-duplication not found");
  process.exit(1);
}
console.log("PASS: composite-key de-duplication found");

// Test 5: Spreads ...feed and overrides articles
if (!hookSource.match(/\{\s*\.\.\.feed\s*,\s*articles\s*\}/)) {
  console.error("FAIL: ...feed spread with articles override not found");
  process.exit(1);
}
console.log("PASS: ...feed spread with articles override found");

console.log("\nAll source-inspection tests passed!");
process.exit(0);
