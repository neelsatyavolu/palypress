import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

const sourcePath = path.join(
  process.cwd(),
  "client/contexts/FollowsContext.tsx",
);
const source = readFileSync(sourcePath, "utf8");

const appSourcePath = path.join(process.cwd(), "client/App.tsx");
const appSource = readFileSync(appSourcePath, "utf8");

assert.match(
  source,
  /export\s+function\s+FollowsProvider/,
  "should export FollowsProvider",
);

assert.match(
  source,
  /export\s+function\s+useFollows/,
  "should export useFollows",
);

assert.match(
  source,
  /["']\/api\/follows["']/,
  "should call the GET /api/follows endpoint",
);

assert.match(
  source,
  /method\s*:\s*["']POST["']/,
  "should POST to follow a publication",
);

assert.match(
  source,
  /`\/api\/follows\/\$\{[^}]+\}`/,
  "should build a DELETE URL with the publication id",
);

assert.match(
  source,
  /method\s*:\s*["']DELETE["']/,
  "should DELETE to unfollow a publication",
);

assert.match(
  source,
  /followPublication\s*(:|=)/,
  "should expose followPublication",
);

assert.match(
  source,
  /unfollowPublication\s*(:|=)/,
  "should expose unfollowPublication",
);

assert.match(
  source,
  /isFollowing\s*(:|=)/,
  "should expose isFollowing",
);

assert.match(
  source,
  /refreshFollows\s*(:|=)/,
  "should expose refreshFollows",
);

assert.match(
  source,
  /isAuthenticated/,
  "should gate behavior on isAuthenticated from useAuth",
);

assert.match(
  appSource,
  /FollowsProvider/,
  "App.tsx should register FollowsProvider",
);

console.log("FollowsContext.test.ts: all assertions passed");
