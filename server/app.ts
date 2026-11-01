import express from "express";
import type { Request, Response, NextFunction } from "express";
import compression from "compression";
import * as path from "path";
import type { Server } from "node:http";
import { registerRoutes } from "./routes";

const log = console.log;

// Everything the app needs from disk. The Node entry reads these with fs;
// the Worker entry bundles them, since Workers have no project filesystem.
export interface AppAssets {
  templates: {
    interstitial: string;
    marketing: string;
    beta: string;
    admin: string;
    privacy: string;
    terms: string;
  };
  appName: string;
  readExpoManifest: (platform: string) => string | null;
  // Directory holding assets/ and static-build/. Omitted on Workers, where
  // Workers Static Assets serves /assets instead.
  staticRoot?: string;
  compress: boolean;
}

function validateEncryptionKey(): void {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      "ENCRYPTION_KEY environment variable is required (base64-encoded 32-byte key)",
    );
  }
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error(
      "ENCRYPTION_KEY must be base64-encoded and decode to 32 bytes",
    );
  }
}

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

function setupCors(app: express.Application) {
  app.use((req, res, next) => {
    // Build set of allowed origins
    const allowedOrigins = new Set<string>();

    // Production domain
    if (process.env.EXPO_PUBLIC_DOMAIN) {
      allowedOrigins.add(`https://${process.env.EXPO_PUBLIC_DOMAIN}`);
    }

    // Development: Replit domains
    if (process.env.REPLIT_DEV_DOMAIN) {
      allowedOrigins.add(`https://${process.env.REPLIT_DEV_DOMAIN}`);
    }
    if (process.env.REPLIT_DOMAINS) {
      process.env.REPLIT_DOMAINS.split(",").forEach((d: string) => {
        allowedOrigins.add(`https://${d.trim()}`);
      });
    }

    const origin = req.header("origin");
    const productionDomain = process.env.EXPO_PUBLIC_DOMAIN
      ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
      : null;

    // React Native apps don't send Origin header - use production domain
    // For browser requests, only allow explicitly configured origins
    if (!origin) {
      // No origin = React Native or same-origin request
      if (productionDomain) {
        res.header("Access-Control-Allow-Origin", productionDomain);
        res.header("Access-Control-Allow-Credentials", "true");
      }
    } else if (allowedOrigins.has(origin)) {
      // Origin matches an allowed domain
      res.header("Access-Control-Allow-Origin", origin);
      res.header("Access-Control-Allow-Credentials", "true");
    }
    // If origin doesn't match, don't set CORS headers (browser will block)

    res.header(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    );
    res.header("Access-Control-Allow-Headers", "Content-Type, X-CSRF-Token");

    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }

    next();
  });
}

function setupBodyParsing(app: express.Application) {
  app.use(
    express.json({
      verify: (req, _res, buf) => {
        req.rawBody = buf;
      },
    }),
  );

  app.use(express.urlencoded({ extended: false }));
}

function setupRequestLogging(app: express.Application) {
  app.use((req, res, next) => {
    const start = Date.now();
    const path = req.path;
    let capturedJsonResponse: Record<string, unknown> | undefined = undefined;

    const originalResJson = res.json;
    res.json = function (bodyJson, ...args) {
      capturedJsonResponse = bodyJson;
      return originalResJson.apply(res, [bodyJson, ...args]);
    };

    res.on("finish", () => {
      if (!path.startsWith("/api")) return;

      const duration = Date.now() - start;

      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    });

    next();
  });
}

function serveExpoManifest(
  platform: string,
  res: Response,
  readExpoManifest: AppAssets["readExpoManifest"],
) {
  const manifest = readExpoManifest(platform);

  if (manifest === null) {
    return res
      .status(404)
      .json({ error: `Manifest not found for platform: ${platform}` });
  }

  res.setHeader("expo-protocol-version", "1");
  res.setHeader("expo-sfv-version", "0");
  res.setHeader("content-type", "application/json");

  res.send(manifest);
}

function getBaseUrl(req: Request): string {
  const forwardedProto = req.header("x-forwarded-proto");
  const protocol = forwardedProto || req.protocol || "https";
  const forwardedHost = req.header("x-forwarded-host");
  const host = forwardedHost || req.get("host");
  return `${protocol}://${host}`;
}

function serveLandingPage({
  req,
  res,
  landingPageTemplate,
  appName,
}: {
  req: Request;
  res: Response;
  landingPageTemplate: string;
  appName: string;
}) {
  const forwardedHost = req.header("x-forwarded-host");
  const host = forwardedHost || req.get("host");
  const baseUrl = getBaseUrl(req);
  const expsUrl = `${host}`;

  log(`baseUrl`, baseUrl);
  log(`expsUrl`, expsUrl);

  const html = landingPageTemplate
    .replace(/BASE_URL_PLACEHOLDER/g, baseUrl)
    .replace(/EXPS_URL_PLACEHOLDER/g, expsUrl)
    .replace(/APP_NAME_PLACEHOLDER/g, appName);

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.status(200).send(html);
}

function configureExpoAndLanding(app: express.Application, assets: AppAssets) {
  const {
    interstitial: interstitialTemplate,
    marketing: marketingTemplate,
    beta: betaTemplate,
    admin: adminTemplate,
    privacy: privacyTemplate,
    terms: termsTemplate,
  } = assets.templates;
  const { appName } = assets;

  const sendHtml = (req: Request, res: Response, template: string) => {
    const html = template
      .replace(/BASE_URL_PLACEHOLDER/g, getBaseUrl(req))
      .replace(/APP_NAME_PLACEHOLDER/g, appName);
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.status(200).send(html);
  };

  log("Serving static Expo files with dynamic manifest routing");

  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith("/api")) {
      return next();
    }

    // The Expo app fetches its manifest from / and /manifest with this header.
    const platform = req.header("expo-platform");
    if (
      (req.path === "/" || req.path === "/manifest") &&
      platform &&
      (platform === "ios" || platform === "android")
    ) {
      return serveExpoManifest(platform, res, assets.readExpoManifest);
    }

    // Public marketing page
    if (req.path === "/") {
      return sendHtml(req, res, marketingTemplate);
    }

    // Beta signup page
    if (req.path === "/beta") {
      return sendHtml(req, res, betaTemplate);
    }

    // Deep-link interstitial ("open in app")
    if (
      req.path === "/open" ||
      req.path === "/app" ||
      req.path.startsWith("/app/")
    ) {
      return serveLandingPage({
        req,
        res,
        landingPageTemplate: interstitialTemplate,
        appName,
      });
    }

    // Admin dashboard for the beta program
    if (req.path === "/admin") {
      return sendHtml(req, res, adminTemplate);
    }

    // Legal pages
    if (req.path === "/privacy") {
      return sendHtml(req, res, privacyTemplate);
    }
    if (req.path === "/terms") {
      return sendHtml(req, res, termsTemplate);
    }

    next();
  });

  if (assets.staticRoot) {
    app.use("/assets", express.static(path.resolve(assets.staticRoot, "assets")));
    app.use(express.static(path.resolve(assets.staticRoot, "static-build")));
  }

  log(
    "Expo routing: marketing at /, beta at /beta, interstitial at /open, admin at /admin, legal at /privacy and /terms",
  );
}

function setupErrorHandler(app: express.Application) {
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const error = err as {
      status?: number;
      statusCode?: number;
      message?: string;
    };

    const status = error.status || error.statusCode || 500;
    const message = error.message || "Internal Server Error";

    res.status(status).json({ message });

    throw err;
  });
}

export async function createApp(assets: AppAssets): Promise<Server> {
  const app = express();

  validateEncryptionKey();

  setupCors(app);

  // Add compression middleware for better performance
  if (assets.compress) {
    app.use(compression());
  }

  setupBodyParsing(app);
  setupRequestLogging(app);

  configureExpoAndLanding(app, assets);

  const server = await registerRoutes(app);

  setupErrorHandler(app);

  return server;
}
