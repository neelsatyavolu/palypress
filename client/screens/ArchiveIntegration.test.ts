import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const homeScreen = fs.readFileSync(
  path.join(process.cwd(), "client/screens/HomeScreen.tsx"),
  "utf8",
);
const homeStack = fs.readFileSync(
  path.join(process.cwd(), "client/navigation/HomeStackNavigator.tsx"),
  "utf8",
);
const articleTypes = fs.readFileSync(
  path.join(process.cwd(), "client/types/article.ts"),
  "utf8",
);
const archiveScreen = fs.readFileSync(
  path.join(process.cwd(), "client/screens/ArchiveSearchScreen.tsx"),
  "utf8",
);

assert.match(
  homeScreen,
  /ArchiveSearchScreen/,
  "HomeScreen should render the isolated archive search screen when Archive is selected",
);
assert.ok(
  /\/api\/archive\/browse/.test(archiveScreen),
  "ArchiveSearchScreen should browse archive results before a search query is entered",
);
assert.ok(
  /CategoryTabs/.test(archiveScreen),
  "ArchiveSearchScreen should render publication tabs for archive browsing",
);
assert.ok(
  /ARCHIVE_PUBLICATIONS/.test(archiveScreen),
  "ArchiveSearchScreen should build tabs from the shared archive publication list",
);
assert.ok(
  /paddingTop:\s*49 \+ insets\.top \+ Spacing\.lg/.test(archiveScreen),
  "ArchiveSearchScreen should match the top search offset to the horizontal page padding",
);
assert.ok(
  /!isSearchMode \? styles\.browseSearchBarContainer : null/.test(
    archiveScreen,
  ),
  "ArchiveSearchScreen should tighten the browse header spacing above archive tabs",
);
assert.ok(
  /isSearchMode\s*\?\s*styles\.searchListContent\s*:\s*styles\.browseListContent/.test(
    archiveScreen,
  ),
  "ArchiveSearchScreen should keep browse tabs closer while preserving search result spacing",
);
assert.match(
  homeStack,
  /ArchiveArticleDetail/,
  "Home stack should register the native archive detail route",
);
assert.match(
  articleTypes,
  /ArchiveArticleDetail/,
  "Home stack params should include the native archive detail route",
);

console.log("ArchiveIntegration.test.ts: all assertions passed");
