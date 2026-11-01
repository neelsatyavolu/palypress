import { handleAsNodeRequest } from "cloudflare:node";
import interstitialTemplate from "./templates/landing-page.html";
import marketingTemplate from "./templates/marketing.html";
import betaTemplate from "./templates/beta.html";
import adminTemplate from "./templates/admin.html";
import privacyTemplate from "./templates/privacy.html";
import termsTemplate from "./templates/terms.html";
import appJson from "../app.json";

// Cloudflare Workers entry. Runs the same Express app as server/index.ts.
// The two setInterval jobs from the Node entry become Cron Triggers here
// (see "triggers" in wrangler.jsonc).
const PORT = 8080;
const WEEKLY_DIGEST_CRON = "0 * * * *";

type ScheduledController = { cron: string };
type ExecutionContext = { waitUntil(promise: Promise<unknown>): void };

let serverReady: Promise<void> | null = null;

// The app is imported lazily because its modules start timers (node-cache,
// rate limiting), and Workers do not allow timers in global scope.
function startServer(): Promise<void> {
  serverReady ??= (async () => {
    const { createApp } = await import("./app");
    const server = await createApp({
      templates: {
        interstitial: interstitialTemplate,
        marketing: marketingTemplate,
        beta: betaTemplate,
        admin: adminTemplate,
        privacy: privacyTemplate,
        terms: termsTemplate,
      },
      appName: appJson.expo?.name || "App Landing Page",
      // static-build is never built for production, so manifests 404 as before.
      readExpoManifest: () => null,
      // Cloudflare compresses responses itself.
      compress: false,
    });
    server.listen(PORT);
  })().catch((error) => {
    serverReady = null;
    throw error;
  });
  return serverReady;
}

// Express trusts one proxy hop. Set the headers it reads from what Cloudflare
// saw, replacing anything the client sent, so req.secure (needed for secure
// session cookies) and req.ip (needed for rate limiting) are right.
function withProxyHeaders(request: Request): Request {
  const headers = new Headers(request.headers);
  headers.set("x-forwarded-proto", "https");
  const clientIp = request.headers.get("cf-connecting-ip");
  if (clientIp) {
    headers.set("x-forwarded-for", clientIp);
  } else {
    headers.delete("x-forwarded-for");
  }
  headers.delete("x-forwarded-host");
  return new Request(request, { headers });
}

async function runScheduledJob(cron: string): Promise<void> {
  if (cron === WEEKLY_DIGEST_CRON) {
    const { runWeeklyDigestIfDue } = await import("./weeklyDigest");
    const { pruneExpiredSessions } = await import("./sessionStore");
    const { storage } = await import("./storage");
    await runWeeklyDigestIfDue({ storage });
    await pruneExpiredSessions();
    return;
  }
  const { pollAllPublicationsForPushNotifications } = await import(
    "./pushNotifications"
  );
  await pollAllPublicationsForPushNotifications();
}

export default {
  async fetch(request: Request): Promise<Response> {
    await startServer();
    return handleAsNodeRequest(PORT, withProxyHeaders(request));
  },

  async scheduled(
    controller: ScheduledController,
    _env: unknown,
    ctx: ExecutionContext,
  ): Promise<void> {
    ctx.waitUntil(
      runScheduledJob(controller.cron).catch((error) => {
        console.error(`Scheduled job ${controller.cron} failed:`, error);
      }),
    );
  },
};
