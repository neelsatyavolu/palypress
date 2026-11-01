import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const profileScreen = readFileSync("client/screens/ProfileScreen.tsx", "utf8");
const signInScreen = readFileSync("client/screens/SignInScreen.tsx", "utf8");
const profileNavigator = readFileSync(
  "client/navigation/ProfileStackNavigator.tsx",
  "utf8",
);

assert.ok(
  existsSync("client/screens/LegalScreen.tsx"),
  "LegalScreen should render Terms and Privacy inside the app",
);

assert.match(
  profileNavigator,
  /Legal:\s*\{\s*document:\s*"terms"\s*\|\s*"privacy";?\s*\}/,
  "Profile stack params should include the in-app Legal screen",
);

assert.match(
  profileNavigator,
  /name="Legal"[\s\S]*component=\{LegalScreen\}/,
  "Profile stack should register the Legal screen",
);

assert.match(
  profileScreen,
  /key:\s*"terms"[\s\S]*navigation\.navigate\("Legal",\s*\{\s*document:\s*"terms"\s*\}\)/,
  "Profile Terms row should open the in-app Legal screen",
);

assert.match(
  profileScreen,
  /key:\s*"privacy"[\s\S]*navigation\.navigate\("Legal",\s*\{\s*document:\s*"privacy"\s*\}\)/,
  "Profile Privacy row should open the in-app Legal screen",
);

assert.doesNotMatch(
  `${profileScreen}\n${signInScreen}`,
  /WebBrowser\.openBrowserAsync\(getLegalUrl\("\/(terms|privacy)"\)\)/,
  "Terms and Privacy links should not open the website browser",
);

assert.match(
  signInScreen,
  /navigation\.navigate\("Legal",\s*\{\s*document:\s*path === "\/terms" \? "terms" : "privacy",?\s*\}\)/,
  "Sign-in legal links should open the in-app Legal screen",
);

assert.match(
  signInScreen,
  /By continuing, you agree to our/,
  "Sign-in should present Terms of Service before Apple, Google, or email login",
);

assert.doesNotMatch(
  signInScreen,
  /Please agree to the Terms of Service and Privacy Policy before signing in/,
  "Sign in with Apple must not be blocked by a terms checkbox alert",
);

assert.match(
  profileNavigator,
  /name="BlockedUsers"/,
  "Profile stack should include a Blocked Users screen",
);
