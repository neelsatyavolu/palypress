const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");

const signInSource = readFileSync(
  path.join(process.cwd(), "client/screens/SignInScreen.tsx"),
  "utf8",
);
const securitySource = readFileSync(
  path.join(process.cwd(), "client/screens/SecuritySettingsScreen.tsx"),
  "utf8",
);

assert.match(
  signInSource,
  /PasswordGuidance/,
  "signup and reset password screens should render password guidance",
);

assert.match(
  securitySource,
  /PasswordGuidance/,
  "security settings should render password guidance while changing passwords",
);

assert.doesNotMatch(
  signInSource + securitySource,
  /At least 8 characters|min\. 8 characters|length < 8/,
  "password screens should not show or enforce the obsolete 8-character rule",
);
