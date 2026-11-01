import { readFileSync } from "node:fs";
import { join } from "node:path";

const source = readFileSync(
  join(__dirname, "HomeScreen.tsx"),
  "utf-8",
);

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

assert(
  /import\s*\{\s*cacheArticle,\s*pruneRecent\s*\}\s*from\s*"@\/lib\/offlineStore"/.test(
    source,
  ),
  "expected import of cacheArticle and pruneRecent from @/lib/offlineStore",
);

assert(
  /\.slice\(0,\s*15\)/.test(source),
  "expected an effect slicing the first 15 feed articles",
);

assert(
  /cacheArticle\(\s*a\s*,\s*"recent"\s*\)/.test(source),
  'expected cacheArticle(...) to be called with "recent"',
);

assert(
  /pruneRecent\(15\)/.test(source),
  "expected pruneRecent(15) to be called",
);

console.log("HomeScreen offline cache source checks passed.");
