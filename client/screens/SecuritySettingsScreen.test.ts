const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");

const sourcePath = path.join(
  process.cwd(),
  "client/screens/SecuritySettingsScreen.tsx",
);
const sourceText = readFileSync(sourcePath, "utf8");

assert.match(
  sourceText,
  /const\s+\{[^}]*deleteAccount[^}]*\}\s*=\s*useAuth\(\)/s,
  "security settings should read deleteAccount from auth context",
);

assert.match(
  sourceText,
  /Delete Account/,
  "security settings should render a Delete Account option",
);

assert.match(
  sourceText,
  /This permanently deletes your account/,
  "security settings should explain that account deletion is permanent",
);

assert.match(
  sourceText,
  /handleDeleteAccount/,
  "security settings should route the option through a delete-account handler",
);
