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

const forgotStart = routesSource.indexOf('app.post("/api/auth/password/forgot"');
const resetStart = routesSource.indexOf('app.post("/api/auth/password/reset"');
const setPasswordRouteStart = routesSource.indexOf(
  'app.post("/api/auth/password/set"',
);
const setPasswordFromResetStart = storageSource.lastIndexOf(
  "async setPasswordFromReset",
);
const setPasswordStart = storageSource.lastIndexOf("async setPassword");
const signInStart = routesSource.indexOf('app.post("/api/auth/email/signin"');
const verifyEmailStart = routesSource.indexOf("// Verify Email");

assert.notEqual(
  forgotStart,
  -1,
  "routes should register POST /api/auth/password/forgot",
);
assert.notEqual(
  resetStart,
  -1,
  "routes should register POST /api/auth/password/reset",
);
assert.notEqual(
  signInStart,
  -1,
  "routes should register POST /api/auth/email/signin",
);
assert.notEqual(
  setPasswordFromResetStart,
  -1,
  "storage should implement setPasswordFromReset",
);

const forgotSource = routesSource.slice(forgotStart, resetStart);
const resetSource = routesSource.slice(resetStart, setPasswordRouteStart);
const signInSource = routesSource.slice(signInStart, verifyEmailStart);
const setPasswordFromResetSource = storageSource.slice(
  setPasswordFromResetStart,
  setPasswordStart,
);

assert.doesNotMatch(
  forgotSource,
  /!\s*user\s*\|\|\s*!\s*user\.passwordHash/,
  "password reset requests should send codes to Google-only accounts too",
);

assert.match(
  resetSource,
  /storage\.setPasswordFromReset/,
  "reset password route should use the Google-converting password setter",
);

assert.match(
  setPasswordFromResetSource,
  /googleId:\s*null[\s\S]*googleAccessToken:\s*null[\s\S]*googleRefreshToken:\s*null/,
  "resetting a password should convert a Google account into an email/password account",
);

assert.match(
  signInSource,
  /googleId[\s\S]*!\s*.*passwordHash[\s\S]*Google account/,
  "email/password sign-in should explain when the address belongs to a Google account",
);
