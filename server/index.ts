import "dotenv/config";
import { createApp } from "./app";
import { startPushNotificationPoller } from "./pushNotifications";
import { startWeeklyDigestScheduler } from "./weeklyDigest";
import * as fs from "fs";
import * as path from "path";

// Node entry, used for local development. Production runs server/worker.ts
// on Cloudflare Workers.
const log = console.log;

function getAppName(): string {
  try {
    const appJsonPath = path.resolve(process.cwd(), "app.json");
    const appJsonContent = fs.readFileSync(appJsonPath, "utf-8");
    const appJson = JSON.parse(appJsonContent);
    return appJson.expo?.name || "App Landing Page";
  } catch {
    return "App Landing Page";
  }
}

function readExpoManifest(platform: string): string | null {
  const manifestPath = path.resolve(
    process.cwd(),
    "static-build",
    platform,
    "manifest.json",
  );

  if (!fs.existsSync(manifestPath)) {
    return null;
  }

  return fs.readFileSync(manifestPath, "utf-8");
}

function readTemplate(file: string): string {
  return fs.readFileSync(
    path.resolve(process.cwd(), "server", "templates", file),
    "utf-8",
  );
}

(async () => {
  const server = await createApp({
    templates: {
      interstitial: readTemplate("landing-page.html"),
      marketing: readTemplate("marketing.html"),
      beta: readTemplate("beta.html"),
      admin: readTemplate("admin.html"),
      privacy: readTemplate("privacy.html"),
      terms: readTemplate("terms.html"),
    },
    appName: getAppName(),
    readExpoManifest,
    staticRoot: process.cwd(),
    compress: true,
  });
  const pushNotificationPoller = startPushNotificationPoller();
  const weeklyDigestScheduler = startWeeklyDigestScheduler();

  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen(port, () => {
    log(`express server serving on port ${port}`);
  });

  process.on("SIGTERM", () => {
    pushNotificationPoller.stop();
    weeklyDigestScheduler.stop();
  });
})();
