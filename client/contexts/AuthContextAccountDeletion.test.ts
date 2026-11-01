const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");

const sourcePath = path.join(process.cwd(), "client/contexts/AuthContext.tsx");
const sourceText = readFileSync(sourcePath, "utf8");

assert.ok(
  sourceText.includes(
    "deleteAccount: () => Promise<{ success: boolean; error?: string }>;",
  ),
  "auth context should expose a deleteAccount method",
);

assert.match(
  sourceText,
  /apiRequest\("DELETE",\s*"\/api\/auth\/account",\s*\{\}\)/,
  "deleteAccount should call the account deletion endpoint",
);

assert.match(
  sourceText,
  /setUser\(null\);[\s\S]*clearCsrfToken\(\);[\s\S]*resetUser\(\);/,
  "deleteAccount should clear local auth and analytics state after deletion",
);

assert.match(
  sourceText,
  /deleteAccount,\s*[\r\n\s]*signOut,/,
  "auth provider should include deleteAccount in its value",
);
