import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const profileScreen = readFileSync("client/screens/ProfileScreen.tsx", "utf8");
const profileNavigator = readFileSync(
  "client/navigation/ProfileStackNavigator.tsx",
  "utf8",
);

assert.match(
  profileScreen,
  /key:\s*"appearance"[\s\S]*label:\s*"Appearance"[\s\S]*navigation\.navigate\("AppearanceSettings"\)/,
  "Profile should show an Appearance row that opens AppearanceSettings",
);

assert.doesNotMatch(
  profileScreen,
  /APPEARANCE/,
  "Profile should not render the full appearance settings panel inline",
);

assert.match(
  profileNavigator,
  /AppearanceSettings:\s*undefined/,
  "Profile stack params should include AppearanceSettings",
);

assert.match(
  profileNavigator,
  /name="AppearanceSettings"[\s\S]*component=\{AppearanceSettingsScreen\}/,
  "Profile stack should register the AppearanceSettings screen",
);
