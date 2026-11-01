const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");

const routesSource = readFileSync(
  path.join(process.cwd(), "server/routes.ts"),
  "utf8",
);
const storageSource = readFileSync(
  path.join(process.cwd(), "server/storage.ts"),
  "utf8",
);

const googleRouteStart = routesSource.indexOf('app.post("/api/auth/google"');
const emailSignUpStart = routesSource.indexOf("// Email/Password Sign Up");
const googleRouteSource = routesSource.slice(
  googleRouteStart,
  emailSignUpStart,
);

assert.notEqual(
  googleRouteStart,
  -1,
  "routes should register POST /api/auth/google",
);

assert.match(
  googleRouteSource,
  /payload\.email_verified\s*!==\s*true[\s\S]*Google account email is not verified/,
  "Google sign-in should only skip app email verification when Google verified the email",
);

assert.match(
  storageSource,
  /async\s+createGoogleUser[\s\S]*\.values\(\{[\s\S]*emailVerified:\s*true/,
  "new Google users should be stored as email verified",
);

assert.match(
  storageSource,
  /const\s+updateData:\s*Partial<User>\s*=\s*\{[\s\S]*emailVerified:\s*true/,
  "returning Google users should have email verification repaired on sign-in",
);

assert.match(
  googleRouteSource,
  /emailVerified:\s*user\.emailVerified/,
  "Google sign-in response should include emailVerified",
);

assert.match(
  googleRouteSource,
  /storage\.getUserByEmail\(email\)[\s\S]*existingUser\??\.passwordHash[\s\S]*Please sign in manually/,
  "Google sign-in should tell email/password users to sign in manually instead of creating a duplicate account",
);
