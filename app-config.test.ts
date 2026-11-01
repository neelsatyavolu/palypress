import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const appConfig = JSON.parse(readFileSync("app.json", "utf8"));

const infoPlist = appConfig.expo?.ios?.infoPlist ?? {};
const locationUsage = infoPlist.NSLocationWhenInUseUsageDescription;

assert.equal(
  locationUsage,
  "Your location is used only to show where you are on the Paly campus map. It never leaves your device.",
  "iOS bundle Info.plist should declare why the app requests foreground location",
);
