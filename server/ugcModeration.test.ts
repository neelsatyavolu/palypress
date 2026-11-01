import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { commentAuthorKey } from "../shared/moderation";

assert.equal(
  commentAuthorKey("palyvoice", 12, "Jane"),
  "palyvoice:id:12",
);
assert.equal(
  commentAuthorKey("palyvoice", 0, "Jane Doe"),
  "palyvoice:name:jane doe",
);

const routesSource = readFileSync(
  path.join(process.cwd(), "server/routes.ts"),
  "utf8",
);
const commentCard = readFileSync(
  path.join(process.cwd(), "client/components/CommentCard.tsx"),
  "utf8",
);
const signInSource = readFileSync(
  path.join(process.cwd(), "client/screens/SignInScreen.tsx"),
  "utf8",
);
const storeConfig = readFileSync(
  path.join(process.cwd(), "store.config.json"),
  "utf8",
);

assert.match(
  routesSource,
  /app\.post\("\/api\/moderation\/report"/,
  "routes should accept comment reports",
);
assert.match(
  routesSource,
  /app\.post\("\/api\/moderation\/block"/,
  "routes should accept author blocks",
);
assert.match(
  routesSource,
  /sendModerationAlert/,
  "reports and blocks should email the developer",
);
assert.match(
  routesSource,
  /\/api\/admin\/reports\/:id\/remove/,
  "admin should be able to remove reported comments within 24 hours",
);
assert.match(
  commentCard,
  /Report/,
  "comment cards should expose a Report action",
);
assert.match(
  commentCard,
  /Block/,
  "comment cards should expose a Block action",
);
assert.match(
  signInSource,
  /legalAgreement/,
  "terms agreement should be presented on the sign-in screen",
);
assert.match(
  storeConfig,
  /"userGeneratedContent":\s*true/,
  "App Store age rating must declare user-generated content",
);
