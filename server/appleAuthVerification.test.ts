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
const schemaSource = readFileSync(
  path.join(process.cwd(), "shared/schema.ts"),
  "utf8",
);
const appJson = readFileSync(path.join(process.cwd(), "app.json"), "utf8");
const signInSource = readFileSync(
  path.join(process.cwd(), "client/screens/SignInScreen.tsx"),
  "utf8",
);
const authContextSource = readFileSync(
  path.join(process.cwd(), "client/contexts/AuthContext.tsx"),
  "utf8",
);

assert.match(
  schemaSource,
  /appleId:\s*text\("apple_id"\)\.unique\(\)/,
  "users schema should store a unique Apple subject identifier",
);

assert.match(
  schemaSource,
  /export const appleSignInSchema[\s\S]*identityToken:\s*z\.string\(\)\.min\(1/,
  "schema should validate Apple identity tokens",
);

const appleRouteStart = routesSource.indexOf('app.post("/api/auth/apple"');
assert.notEqual(
  appleRouteStart,
  -1,
  "routes should register POST /api/auth/apple",
);

const emailSignUpStart = routesSource.indexOf("// Email/Password Sign Up");
const appleRouteSource = routesSource.slice(appleRouteStart, emailSignUpStart);

assert.match(
  appleRouteSource,
  /verifyAppleIdentityToken/,
  "Apple sign-in should verify the identity token with Apple",
);

assert.match(
  appleRouteSource,
  /storage\.getUserByAppleId\(payload\.appleId\)/,
  "Apple sign-in should look up returning users by Apple user id",
);

assert.match(
  appleRouteSource,
  /payload\.emailVerified\s*===\s*false[\s\S]*Apple account email is not verified/,
  "Apple sign-in should only reject an email Apple itself marked unverified",
);

assert.match(
  appleRouteSource,
  /resolveAppleAccountEmail/,
  "Apple sign-in should create an account even when Apple omits email on later logins",
);

assert.match(
  appleRouteSource,
  /pending2FAUserId/,
  "Apple sign-in should honor two-factor authentication",
);

assert.match(
  appleRouteSource,
  /\(req\.session as any\)\.userId = user\.id/,
  "Apple sign-in should create a session after verification",
);

assert.match(
  routesSource,
  /app\.use\("\/api\/auth\/apple", authLimiter\)/,
  "Apple sign-in should use the auth rate limiter",
);

assert.match(
  storageSource,
  /async\s+getUserByAppleId\(appleId:\s*string\)/,
  "storage should look up users by Apple id",
);

assert.match(
  storageSource,
  /async\s+createAppleUser[\s\S]*appleId:\s*insertUser\.appleId[\s\S]*emailVerified:\s*true/,
  "new Apple users should be stored as email verified",
);

assert.match(
  appJson,
  /"usesAppleSignIn":\s*true/,
  "iOS config should enable the Sign in with Apple capability",
);

assert.match(
  appJson,
  /expo-apple-authentication/,
  "Expo config should include the Sign in with Apple plugin",
);

assert.match(
  signInSource,
  /AppleAuthenticationButton/,
  "sign-in screen should show Apple's official Sign in with Apple button",
);

assert.match(
  authContextSource,
  /signInWithApple/,
  "auth context should expose Sign in with Apple",
);

const applePatch = readFileSync(
  path.join(process.cwd(), "patches/expo-apple-authentication+8.0.8.patch"),
  "utf8",
);
assert.match(
  applePatch,
  /connectedScenes/,
  "Apple Sign-In must present from a scene window on iPad, not deprecated keyWindow",
);
assert.match(
  applePatch,
  /-      fatalError/,
  "Apple Sign-In patch should remove the keyWindow fatalError",
);
