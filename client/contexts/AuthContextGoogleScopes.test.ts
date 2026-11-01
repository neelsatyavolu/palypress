const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");

const sourceText = readFileSync(
  path.join(process.cwd(), "client/contexts/AuthContext.tsx"),
  "utf8",
);

const nativeScopesMatch = sourceText.match(
  /GoogleSignin\.configure\(\{[\s\S]*?scopes:\s*\[([\s\S]*?)\]/,
);

assert.ok(nativeScopesMatch, "native Google sign-in should configure scopes");

const nativeScopes = Array.from(
  nativeScopesMatch[1].matchAll(/"([^"]+)"/g),
  (match) => match[1],
);

assert.deepEqual(
  nativeScopes,
  [
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile",
  ],
  "native Google sign-in should only request email and profile identity scopes",
);

assert.match(
  sourceText,
  /authUrl\.searchParams\.set\("scope",\s*"openid email profile"\)/,
  "web Google sign-in should only request OpenID email and profile scopes",
);
