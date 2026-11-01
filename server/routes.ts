import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "node:http";
import session from "express-session";
import rateLimit from "express-rate-limit";
import { storage } from "./storage";
import { NeonSessionStore } from "./sessionStore";
import { CacheService } from "./cache";
import { decryptNullable } from "./encryption";
import { wpFetch } from "./wpFetch";
import { type User } from "@shared/schema";
import {
  googleSignInSchema,
  appleSignInSchema,
  emailSignUpSchema,
  emailSignInSchema,
  verifyEmailSchema,
  resendVerificationSchema,
  requestPasswordResetSchema,
  updateProfileSchema,
  setPasswordSchema,
  resetPasswordSchema,
  setupTwoFactorSchema,
  verifyTwoFactorSchema,
  disableTwoFactorSchema,
  saveArticleSchema,
  postCommentSchema,
  editCommentSchema,
  reportCommentSchema,
  blockUserSchema,
  upvoteArticleSchema,
  getUpvoteCountsSchema,
  updateNotificationPreferenceSchema,
  updateWeeklyDigestPreferenceSchema,
  registerPushTokenSchema,
  submitFeedbackSchema,
  insertManualClassSchema,
  insertTodoSchema,
  updateTodoSchema,
  betaSignupSchema,
  insertFollowSchema,
} from "@shared/schema";
import {
  getPublicationConfigById,
  DEFAULT_PUBLICATION_ID,
  PUBLICATION_CONFIGS,
} from "@shared/publications";
import { fromZodError } from "zod-validation-error";
import { verifyGoogleIdToken } from "./googleAuth";
import {
  resolveAppleAccountEmail,
  verifyAppleIdentityToken,
} from "./appleAuth";
import { commentAuthorKey } from "@shared/moderation";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import speakeasy from "speakeasy";
import QRCode from "qrcode";
import {
  sendPasswordResetEmail,
  sendVerificationEmail,
  sendBetaSignupNotification,
  sendBetaApprovalEmail,
  sendFeedbackNotification,
  sendModerationAlert,
} from "./email";
import {
  getExternalFeedArticles,
  isExternalPublicationId,
} from "./externalFeeds";
import { detectSnoAd, isAllowedArticleUrl } from "./snoAds";
import {
  buildArchiveBrowseUrl,
  buildArchiveArticleUrl,
  buildArchiveSearchUrl,
  buildArchiveSectionTextUrl,
  fetchArchiveHtml,
  isValidArchiveArticleId,
  parseArchiveArticleHtml,
  parseArchiveSearchHtml,
} from "./archive";
import { getArchivePublicationByCode } from "@shared/archive";
import {
  filterPalyCalendarEvents,
  getPalyCalendarEventDetailsUrl,
  getPalyCalendarMonthUrl,
  getPalyCalendarMonthStarts,
  parsePalyCalendarEventDetailsHtml,
  parsePalyCalendarHtml,
} from "./palyCalendar";

function toClientUser(user: User) {
  return {
    id: user.id,
    googleId: user.googleId,
    appleId: user.appleId,
    email: user.email,
    displayName: user.displayName,
    photoUrl: user.photoUrl,
    studentId: user.studentId,
    emailVerified: user.emailVerified,
    weeklyDigestEnabled: user.weeklyDigestEnabled,
    twoFactorEnabled: user.twoFactorEnabled,
    hasPassword: Boolean(user.passwordHash),
  };
}

// Helper to get WordPress API base URL for a publication
function getWpApiBaseUrl(publicationId?: string): string {
  const pubConfig = getPublicationConfigById(
    publicationId || DEFAULT_PUBLICATION_ID,
  );
  return pubConfig?.wpApiBaseUrl || PUBLICATION_CONFIGS[0].wpApiBaseUrl;
}

// Extract student ID from PAUSD email (e.g., 123456@pausd.us -> 123456)
function extractStudentId(email: string): string | null {
  const match = email.match(/^(\d+)@pausd\.us$/);
  return match ? match[1] : null;
}

function appleDisplayName(
  fullName?: {
    givenName?: string | null;
    familyName?: string | null;
  } | null,
): string | null {
  const name = [fullName?.givenName, fullName?.familyName]
    .filter((part): part is string => Boolean(part && part.trim()))
    .join(" ")
    .trim();
  return name || null;
}

function filterCommentsForViewer(
  comments: any[],
  blockedKeys: Set<string>,
  publicationId: string,
) {
  const hiddenIds = new Set<number>();
  for (const comment of comments) {
    const key = commentAuthorKey(
      publicationId,
      Number(comment.author) || 0,
      String(comment.author_name || ""),
    );
    if (blockedKeys.has(key)) {
      hiddenIds.add(comment.id);
    }
  }
  return comments.filter(
    (comment) =>
      !hiddenIds.has(comment.id) && !hiddenIds.has(Number(comment.parent) || 0),
  );
}

async function commentsForViewer(
  comments: unknown,
  req: Request,
  publicationId?: string,
) {
  const list = Array.isArray(comments) ? comments : [];
  const viewerId = (req.session as any).userId;
  if (!viewerId) return list;
  const blocks = await storage.listUserBlocks(viewerId);
  return filterCommentsForViewer(
    list,
    new Set(blocks.map((block) => block.blockedAuthorKey)),
    publicationId || DEFAULT_PUBLICATION_ID,
  );
}

async function sendNewVerificationCode(userId: string, email: string) {
  await storage.deleteUserVerificationTokens(userId);

  const verificationCode = crypto.randomInt(100000, 999999).toString();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

  await storage.createVerificationToken(userId, verificationCode, expiresAt);

  return sendVerificationEmail({
    to: email,
    code: verificationCode,
  });
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Trust first proxy (Cloudflare) - required for secure cookies behind reverse proxy
  if (process.env.NODE_ENV === "production") {
    app.set("trust proxy", 1);
  }

  // Require SESSION_SECRET in production
  const sessionSecret = process.env.SESSION_SECRET;
  if (!sessionSecret && process.env.NODE_ENV === "production") {
    throw new Error(
      "SESSION_SECRET environment variable is required in production",
    );
  }

  // Sessions live in Postgres (Neon) so they survive across Worker isolates
  app.use(
    session({
      store: new NeonSessionStore(),
      secret: sessionSecret || "dev-only-secret-key",
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        sameSite: "lax",
      },
    }),
  );

  // Rate limiting middleware
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 15, // 15 attempts per window
    message: {
      error: "Too many authentication attempts. Please try again later.",
    },
    standardHeaders: true,
    legacyHeaders: false,
  });

  const verificationLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 30, // 30 verification attempts per hour
    message: {
      error: "Too many verification attempts. Please try again later.",
    },
    standardHeaders: true,
    legacyHeaders: false,
  });

  const apiLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 300, // 300 requests per minute for general API
    message: { error: "Too many requests. Please slow down." },
    standardHeaders: true,
    legacyHeaders: false,
  });

  // Apply rate limiting to auth endpoints
  app.use("/api/auth/email/signin", authLimiter);
  app.use("/api/auth/email/signup", authLimiter);
  app.use("/api/auth/google", authLimiter);
  app.use("/api/auth/apple", authLimiter);
  const moderationLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 40,
    message: { error: "Too many reports. Please try again later." },
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use("/api/moderation/report", moderationLimiter);
  app.use("/api/moderation/block", moderationLimiter);
  app.use("/api/auth/signin-2fa", authLimiter);
  app.use("/api/auth/email/verify", verificationLimiter);
  app.use("/api/auth/email/resend-verification", verificationLimiter);
  app.use("/api/auth/2fa", verificationLimiter);
  app.use("/api/auth/password", verificationLimiter);
  app.use("/api/", apiLimiter);

  // CSRF token endpoint - returns a dummy token for mobile app compatibility
  // Note: CSRF protection is not enforced for this React Native app since
  // CSRF attacks target browsers, not mobile apps. The other security
  // measures (session auth, rate limiting, CORS) provide sufficient protection.
  app.get("/api/csrf-token", (_req, res) => {
    res.json({ csrfToken: "mobile-app" });
  });

  app.get("/api/archive/search", async (req, res) => {
    try {
      const query = typeof req.query.q === "string" ? req.query.q.trim() : "";
      const page = Math.max(parseInt(req.query.page as string) || 1, 1);
      const perPage = Math.max(
        1,
        Math.min(parseInt(req.query.per_page as string) || 20, 20),
      );

      if (query.length < 2) {
        return res.json({
          results: [],
          total: 0,
          page,
          perPage,
          hasMore: false,
        });
      }

      const cacheKey = `search:${query}:${page}:${perPage}`;
      let payload = CacheService.getArchiveData(cacheKey);
      if (!payload) {
        const url = buildArchiveSearchUrl({ query, page, perPage });
        const html = await fetchArchiveHtml(url);
        payload = parseArchiveSearchHtml(html, { query, page, perPage });
        CacheService.setArchiveData(cacheKey, payload);
      }

      res.json(payload);
    } catch (error) {
      console.error("Archive search error:", error);
      res.status(500).json({ error: "Failed to search archive" });
    }
  });

  app.get("/api/archive/browse", async (req, res) => {
    try {
      const rawPublication =
        typeof req.query.publication === "string"
          ? req.query.publication.trim()
          : "";
      const publicationCode =
        rawPublication && rawPublication !== "all" ? rawPublication : null;
      const page = Math.max(parseInt(req.query.page as string) || 1, 1);
      const perPage = Math.max(
        1,
        Math.min(parseInt(req.query.per_page as string) || 20, 20),
      );

      if (publicationCode && !getArchivePublicationByCode(publicationCode)) {
        return res
          .status(400)
          .json({ error: "Invalid archive publication code" });
      }

      const cacheKey = `browse:${publicationCode || "all"}:${page}:${perPage}`;
      let payload = CacheService.getArchiveData(cacheKey);
      if (!payload) {
        const url = buildArchiveBrowseUrl({ publicationCode, page, perPage });
        const html = await fetchArchiveHtml(url);
        payload = parseArchiveSearchHtml(html, {
          query: "*",
          page,
          perPage,
        });
        CacheService.setArchiveData(cacheKey, payload);
      }

      res.json(payload);
    } catch (error) {
      console.error("Archive browse error:", error);
      res.status(500).json({ error: "Failed to browse archive" });
    }
  });

  app.get("/api/archive/articles/:archiveId", async (req, res) => {
    try {
      const archiveId = req.params.archiveId;
      if (!isValidArchiveArticleId(archiveId)) {
        return res.status(400).json({ error: "Invalid archive article id" });
      }

      const cacheKey = `article:${archiveId}`;
      let payload = CacheService.getArchiveData(cacheKey);
      if (!payload) {
        const url = buildArchiveArticleUrl(archiveId);
        const sectionTextUrl = buildArchiveSectionTextUrl(archiveId);
        const [html, sectionTextXml] = await Promise.all([
          fetchArchiveHtml(url),
          fetchArchiveHtml(sectionTextUrl),
        ]);
        payload = parseArchiveArticleHtml(html, url.toString(), sectionTextXml);
        CacheService.setArchiveData(cacheKey, payload);
      }

      res.json(payload);
    } catch (error) {
      console.error("Archive article error:", error);
      res.status(500).json({ error: "Failed to load archive article" });
    }
  });

  app.get("/api/publications/:publicationId/feed", async (req, res) => {
    try {
      const publicationId = req.params.publicationId;
      if (!isExternalPublicationId(publicationId)) {
        return res.status(404).json({ error: "External feed not found" });
      }

      const offset = Math.max(parseInt(req.query.offset as string) || 0, 0);
      const perPage = Math.max(
        1,
        Math.min(parseInt(req.query.per_page as string) || 10, 25),
      );

      let articles = CacheService.getExternalFeedData(publicationId);
      if (!articles) {
        articles = await getExternalFeedArticles(publicationId);
        CacheService.setExternalFeedData(publicationId, articles);
      }

      const pagedArticles = articles.slice(offset, offset + perPage);
      res.json({
        articles: pagedArticles,
        hasMore: offset + perPage < articles.length,
      });
    } catch (error) {
      console.error("External publication feed error:", error);
      res.status(500).json({ error: "Failed to load external feed" });
    }
  });

  // Auto-detect a publication's SNO in-content ad spot from its article page.
  app.get("/api/sno-ad-slot", async (req, res) => {
    try {
      const url = String(req.query.url ?? "");
      if (!isAllowedArticleUrl(url)) {
        return res.status(400).json({ error: "Invalid or disallowed url" });
      }

      const cacheKey = `snoad:${url}`;
      let adSlot = CacheService.getWordPressData(cacheKey);
      if (adSlot === undefined) {
        adSlot = (await detectSnoAd(url)) ?? null;
        CacheService.setWordPressData(cacheKey, adSlot);
      }

      res.json({ adSlot });
    } catch (error) {
      console.error("SNO ad slot detection error:", error);
      res.status(500).json({ error: "Failed to detect ad slot" });
    }
  });

  // Authentication middleware
  const requireAuth = (req: Request, res: Response, next: NextFunction) => {
    const userId = (req.session as any).userId;
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }
    next();
  };

  const VALID_PUBLICATION_IDS = new Set([
    "palyvoice",
    "infocus",
    "campanile",
    "verde",
    "cmag",
    "viking",
    "anthro",
    "archive",
    "ink",
    "veritas",
    "viaverde",
    "kply",
    "proof",
  ]);

  // Google OAuth Sign In
  app.post("/api/auth/google", async (req, res) => {
    try {
      const result = googleSignInSchema.safeParse(req.body);
      if (!result.success) {
        const error = fromZodError(result.error);
        return res.status(400).json({ error: error.message });
      }

      const { idToken, accessToken } = result.data;
      const { user: googleUser } = req.body;

      // Verify the ID token with Google (accept both web and iOS client IDs as valid audiences)
      const payload = await verifyGoogleIdToken(idToken, [
        process.env.GOOGLE_WEB_CLIENT_ID,
        process.env.GOOGLE_IOS_CLIENT_ID,
      ]);
      if (!payload) {
        return res.status(401).json({ error: "Invalid Google token" });
      }

      const email = payload.email;
      if (!email) {
        return res.status(403).json({ error: "Google account email missing" });
      }

      if (payload.email_verified !== true) {
        return res
          .status(403)
          .json({ error: "Google account email is not verified" });
      }

      // Extract student ID from email if it's a student account
      const studentId = extractStudentId(email);

      // Check if user exists
      let user = await storage.getUserByGoogleId(payload.sub);

      if (user) {
        // Update existing user with latest info
        user = await storage.updateUserGoogleTokens(
          user.id,
          accessToken || null,
          null, // refresh token handled separately
          googleUser?.displayName || payload.name || null,
          googleUser?.photoUrl || payload.picture || null,
        );
      } else {
        const existingUser = await storage.getUserByEmail(email);
        if (existingUser?.passwordHash) {
          return res.status(409).json({
            error:
              "This account was created with email and password. Please sign in manually.",
          });
        }

        // Create new user
        user = await storage.createGoogleUser({
          googleId: payload.sub,
          email,
          displayName: googleUser?.displayName || payload.name || null,
          photoUrl: googleUser?.photoUrl || payload.picture || null,
          studentId,
          googleAccessToken: accessToken || null,
        });
      }

      if (!user) {
        return res
          .status(500)
          .json({ error: "Failed to create or update user" });
      }

      // Check if 2FA is enabled
      if (user.twoFactorEnabled) {
        // Set pending 2FA session
        (req.session as any).pending2FAUserId = user.id;
        return res.status(200).json({
          message: "Two-factor authentication required",
          requires2FA: true,
        });
      }

      // Set session
      (req.session as any).userId = user.id;

      res.json({
        message: "Signed in successfully",
        user: toClientUser(user),
      });
    } catch (error) {
      console.error("Google signin error:", error);
      const message =
        process.env.NODE_ENV !== "production" && error instanceof Error
          ? error.message
          : "Failed to sign in with Google";
      res.status(500).json({ error: message });
    }
  });

  // Sign in with Apple
  app.post("/api/auth/apple", async (req, res) => {
    try {
      const result = appleSignInSchema.safeParse(req.body);
      if (!result.success) {
        const error = fromZodError(result.error);
        return res.status(400).json({ error: error.message });
      }

      const { identityToken, fullName } = result.data;
      const payload = await verifyAppleIdentityToken(identityToken);
      const email = resolveAppleAccountEmail(payload.appleId, payload.email);
      const displayName = appleDisplayName(fullName);

      if (payload.email && payload.emailVerified === false) {
        return res
          .status(403)
          .json({ error: "Apple account email is not verified" });
      }

      let user = await storage.getUserByAppleId(payload.appleId);

      if (user) {
        user = await storage.updateAppleUser(user.id, displayName);
      } else {
        const existingUser = await storage.getUserByEmail(email);
        if (existingUser) {
          if (
            existingUser.appleId &&
            existingUser.appleId !== payload.appleId
          ) {
            return res.status(409).json({
              error:
                "This email is already linked to a different Apple account.",
            });
          }
          user = await storage.linkAppleId(
            existingUser.id,
            payload.appleId,
            displayName,
          );
        } else {
          user = await storage.createAppleUser({
            appleId: payload.appleId,
            email,
            displayName,
            studentId: extractStudentId(email),
          });
        }
      }

      if (!user) {
        return res
          .status(500)
          .json({ error: "Failed to create or update user" });
      }

      if (user.twoFactorEnabled) {
        (req.session as any).pending2FAUserId = user.id;
        return res.status(200).json({
          message: "Two-factor authentication required",
          requires2FA: true,
        });
      }

      (req.session as any).userId = user.id;

      res.json({
        message: "Signed in successfully",
        user: toClientUser(user),
      });
    } catch (error) {
      console.error("Apple signin error:", error);
      const message =
        process.env.NODE_ENV !== "production" && error instanceof Error
          ? error.message
          : "Failed to sign in with Apple";
      const status =
        error instanceof Error &&
        error.message === "Invalid Apple identity token"
          ? 401
          : 500;
      res.status(status).json({ error: message });
    }
  });

  // Email/Password Sign Up
  app.post("/api/auth/email/signup", async (req, res) => {
    try {
      const result = emailSignUpSchema.safeParse(req.body);
      if (!result.success) {
        const error = fromZodError(result.error);
        return res.status(400).json({ error: error.message });
      }

      const { email, password, displayName } = result.data;

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        if (existingUser.passwordHash && !existingUser.emailVerified) {
          const passwordHash = await bcrypt.hash(password, 10);
          await storage.setPassword(existingUser.id, passwordHash);
          await storage.updateDisplayName(existingUser.id, displayName);

          const emailResult = await sendNewVerificationCode(
            existingUser.id,
            email,
          );

          if (!emailResult.success) {
            console.error(
              "Failed to send verification email:",
              emailResult.error,
            );
            return res
              .status(500)
              .json({ error: "Failed to send verification email" });
          }

          return res.json({
            message:
              "Verification code sent. Please check your email to finish creating your account.",
            userId: existingUser.id,
            email: existingUser.email,
          });
        }

        return res.status(400).json({ error: "Email already registered" });
      }

      // Extract student ID from email if it's a student account
      const studentId = email.match(/^(\d+)@pausd\.us$/)
        ? email.match(/^(\d+)@pausd\.us$/)![1]
        : null;

      // Hash password
      const passwordHash = await bcrypt.hash(password, 10);

      // Create user
      const user = await storage.createEmailUser({
        email,
        passwordHash,
        displayName,
        studentId,
      });

      const emailResult = await sendNewVerificationCode(user.id, email);

      if (!emailResult.success) {
        console.error("Failed to send verification email:", emailResult.error);
        return res
          .status(500)
          .json({ error: "Failed to send verification email" });
      }

      res.status(201).json({
        message:
          "Account created. Please check your email for verification code.",
        userId: user.id,
        email: user.email,
      });
    } catch (error) {
      console.error("Email signup error:", error);
      res.status(500).json({ error: "Failed to create account" });
    }
  });

  // Email/Password Sign In
  app.post("/api/auth/email/signin", async (req, res) => {
    try {
      const result = emailSignInSchema.safeParse(req.body);
      if (!result.success) {
        const error = fromZodError(result.error);
        return res.status(400).json({ error: error.message });
      }

      const { email, password } = result.data;

      const userForEmail = await storage.getUserByEmail(email);
      if (userForEmail?.googleId && !userForEmail.passwordHash) {
        return res.status(409).json({
          error:
            "This is a Google account. Sign in with Google, or reset your password to switch to email and password.",
        });
      }

      // Verify credentials
      const user = await storage.verifyPassword(email, password);
      if (!user) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      // Check if email is verified
      if (!user.emailVerified) {
        return res.status(403).json({
          error: "Please verify your email before signing in",
          emailVerified: false,
          userId: user.id,
        });
      }

      // Check if 2FA is enabled
      if (user.twoFactorEnabled) {
        // Set pending 2FA session
        (req.session as any).pending2FAUserId = user.id;
        return res.status(200).json({
          message: "Two-factor authentication required",
          requires2FA: true,
        });
      }

      // Update last login
      await storage.updateLastLogin(user.id);

      // Set session
      (req.session as any).userId = user.id;

      res.json({
        message: "Signed in successfully",
        user: toClientUser(user),
      });
    } catch (error) {
      console.error("Email signin error:", error);
      res.status(500).json({ error: "Failed to sign in" });
    }
  });

  // Verify Email
  app.post("/api/auth/email/verify", async (req, res) => {
    try {
      const result = verifyEmailSchema.safeParse(req.body);
      if (!result.success) {
        const error = fromZodError(result.error);
        return res.status(400).json({ error: error.message });
      }

      const { token } = result.data;

      // Get verification token
      const verificationToken = await storage.getVerificationToken(token);
      if (!verificationToken) {
        return res.status(400).json({ error: "Invalid verification code" });
      }

      // Check if token is expired
      if (new Date() > verificationToken.expiresAt) {
        await storage.deleteVerificationToken(token);
        return res.status(400).json({ error: "Verification code has expired" });
      }

      // Mark email as verified
      await storage.markEmailAsVerified(verificationToken.userId);

      // Delete all verification tokens for this user
      await storage.deleteUserVerificationTokens(verificationToken.userId);

      // Get updated user
      const user = await storage.getUser(verificationToken.userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Set session
      (req.session as any).userId = user.id;

      res.json({
        message: "Email verified successfully",
        user: toClientUser(user),
      });
    } catch (error) {
      console.error("Email verification error:", error);
      res.status(500).json({ error: "Failed to verify email" });
    }
  });

  // Resend Verification Email
  app.post("/api/auth/email/resend-verification", async (req, res) => {
    try {
      const result = resendVerificationSchema.safeParse(req.body);
      if (!result.success) {
        const error = fromZodError(result.error);
        return res.status(400).json({ error: error.message });
      }

      const { email } = result.data;

      // Get user
      const user = await storage.getUserByEmail(email);
      if (!user) {
        // Don't reveal if email exists
        return res.json({
          message: "If that email exists, a verification code has been sent",
        });
      }

      // Check if already verified
      if (user.emailVerified) {
        return res.status(400).json({ error: "Email is already verified" });
      }

      const emailResult = await sendNewVerificationCode(user.id, email);

      if (!emailResult.success) {
        console.error("Failed to send verification email:", emailResult.error);
        return res
          .status(500)
          .json({ error: "Failed to send verification email" });
      }

      res.json({ message: "Verification code sent to your email" });
    } catch (error) {
      console.error("Resend verification error:", error);
      res.status(500).json({ error: "Failed to resend verification email" });
    }
  });

  // Request Password Reset
  app.post("/api/auth/password/forgot", async (req, res) => {
    try {
      const result = requestPasswordResetSchema.safeParse(req.body);
      if (!result.success) {
        const error = fromZodError(result.error);
        return res.status(400).json({ error: error.message });
      }

      const { email } = result.data;
      const genericMessage =
        "If that email can receive a reset code, one has been sent";

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.json({ message: genericMessage });
      }

      await storage.deleteUserPasswordResetTokens(user.id);

      const resetCode = crypto.randomInt(100000, 999999).toString();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

      await storage.createPasswordResetToken(user.id, resetCode, expiresAt);

      const emailResult = await sendPasswordResetEmail({
        to: email,
        code: resetCode,
      });

      if (!emailResult.success) {
        console.error(
          "Failed to send password reset email:",
          emailResult.error,
        );
        return res.status(500).json({ error: "Failed to send reset email" });
      }

      res.json({ message: genericMessage });
    } catch (error) {
      console.error("Request password reset error:", error);
      res.status(500).json({ error: "Failed to request password reset" });
    }
  });

  // Reset Password
  app.post("/api/auth/password/reset", async (req, res) => {
    try {
      const result = resetPasswordSchema.safeParse(req.body);
      if (!result.success) {
        const error = fromZodError(result.error);
        return res.status(400).json({ error: error.message });
      }

      const { token, newPassword } = result.data;
      const resetToken = await storage.getPasswordResetToken(token);
      if (!resetToken) {
        return res.status(400).json({ error: "Invalid reset code" });
      }

      if (new Date() > resetToken.expiresAt) {
        await storage.deletePasswordResetToken(token);
        return res.status(400).json({ error: "Reset code has expired" });
      }

      const user = await storage.getUser(resetToken.userId);
      if (!user) {
        await storage.deletePasswordResetToken(token);
        return res.status(404).json({ error: "User not found" });
      }

      await storage.setPasswordFromReset(
        user.id,
        await bcrypt.hash(newPassword, 10),
      );
      await storage.deleteUserPasswordResetTokens(user.id);

      res.json({ message: "Password reset successfully" });
    } catch (error) {
      console.error("Reset password error:", error);
      res.status(500).json({ error: "Failed to reset password" });
    }
  });

  // Sign out
  app.post("/api/auth/signout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: "Failed to sign out" });
      }
      res.json({ message: "Signed out successfully" });
    });
  });

  // Delete account
  app.delete("/api/auth/account", async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const deleted = await storage.deleteUser(userId);
      if (!deleted) {
        return res.status(404).json({ error: "User not found" });
      }

      req.session.destroy((err) => {
        if (err) {
          console.error("Delete account session cleanup error:", err);
        }
        res.json({ message: "Account deleted successfully" });
      });
    } catch (error) {
      console.error("Delete account error:", error);
      res.status(500).json({ error: "Failed to delete account" });
    }
  });

  // Get current user
  app.get("/api/auth/me", async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json({
        user: toClientUser(user),
      });
    } catch (error) {
      console.error("Get current user error:", error);
      res.status(500).json({ error: "Failed to get user" });
    }
  });

  // Update profile
  app.patch("/api/auth/profile", async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const result = updateProfileSchema.safeParse(req.body);
      if (!result.success) {
        const error = fromZodError(result.error);
        return res.status(400).json({ error: error.message });
      }

      const { displayName } = result.data;
      const updatedUser = await storage.updateDisplayName(userId, displayName);
      if (!updatedUser) {
        return res.status(404).json({ error: "User not found" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json({
        user: toClientUser(user),
      });
    } catch (error) {
      console.error("Update profile error:", error);
      res.status(500).json({ error: "Failed to update profile" });
    }
  });

  // Set password (for Google OAuth users or changing password)
  app.post("/api/auth/password/set", async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const result = setPasswordSchema.safeParse(req.body);
      if (!result.success) {
        const error = fromZodError(result.error);
        return res.status(400).json({ error: error.message });
      }

      const { currentPassword, newPassword } = result.data;
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // If user has existing password, verify it
      if (user.passwordHash && currentPassword) {
        const success = await storage.updatePassword(
          userId,
          currentPassword,
          await bcrypt.hash(newPassword, 10),
        );
        if (!success) {
          return res
            .status(401)
            .json({ error: "Current password is incorrect" });
        }
      } else if (user.passwordHash && !currentPassword) {
        return res
          .status(400)
          .json({ error: "Current password is required to change password" });
      } else {
        // No existing password (Google user setting first password)
        // Mark email as verified since they're a Google user
        await storage.setPassword(userId, await bcrypt.hash(newPassword, 10));
        if (user.googleId) {
          await storage.markEmailAsVerified(userId);
        }
      }

      const updatedUser = await storage.getUser(userId);
      res.json({
        message: "Password set successfully",
        user: updatedUser ? toClientUser(updatedUser) : undefined,
      });
    } catch (error) {
      console.error("Set password error:", error);
      res.status(500).json({ error: "Failed to set password" });
    }
  });

  // Setup Two-Factor Authentication (generate secret and QR code)
  app.post("/api/auth/2fa/setup", async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Check if user has password set (required for 2FA)
      if (!user.passwordHash) {
        return res.status(400).json({
          error:
            "Please set a password before enabling two-factor authentication",
        });
      }

      // Generate secret
      const secret = speakeasy.generateSecret({
        name: `Paly Voice (${user.email})`,
        issuer: "Paly Voice",
      });

      // Generate backup codes (10 codes)
      const backupCodes: string[] = [];
      const hashedBackupCodes: string[] = [];
      for (let i = 0; i < 10; i++) {
        const code = crypto.randomBytes(4).toString("hex").toUpperCase();
        backupCodes.push(code);
        hashedBackupCodes.push(await bcrypt.hash(code, 10));
      }

      // Save secret and backup codes (but don't enable yet)
      await storage.setupTwoFactor(userId, secret.base32, hashedBackupCodes);

      // Generate QR code
      const qrCode = await QRCode.toDataURL(secret.otpauth_url!);

      res.json({
        secret: secret.base32,
        qrCode,
        backupCodes,
      });
    } catch (error) {
      console.error("Setup 2FA error:", error);
      res
        .status(500)
        .json({ error: "Failed to setup two-factor authentication" });
    }
  });

  // Verify and enable Two-Factor Authentication
  app.post("/api/auth/2fa/verify-setup", async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const result = setupTwoFactorSchema.safeParse(req.body);
      if (!result.success) {
        const error = fromZodError(result.error);
        return res.status(400).json({ error: error.message });
      }

      const { token } = result.data;
      const secret = await storage.getTwoFactorSecret(userId);

      if (!secret) {
        return res
          .status(400)
          .json({ error: "Two-factor authentication not set up" });
      }

      // Verify token
      const verified = speakeasy.totp.verify({
        secret,
        encoding: "base32",
        token,
        window: 2, // Allow 2 time steps (60 seconds) of clock drift
      });

      if (!verified) {
        return res.status(400).json({ error: "Invalid verification code" });
      }

      // Enable 2FA
      await storage.enableTwoFactor(userId);

      res.json({ message: "Two-factor authentication enabled successfully" });
    } catch (error) {
      console.error("Verify 2FA setup error:", error);
      res
        .status(500)
        .json({ error: "Failed to verify two-factor authentication" });
    }
  });

  // Disable Two-Factor Authentication
  app.post("/api/auth/2fa/disable", async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const result = disableTwoFactorSchema.safeParse(req.body);
      if (!result.success) {
        const error = fromZodError(result.error);
        return res.status(400).json({ error: error.message });
      }

      const { password, token } = result.data;
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Verify password
      if (!user.passwordHash) {
        return res.status(400).json({ error: "Password not set" });
      }

      const isValidPassword = await bcrypt.compare(password, user.passwordHash);
      if (!isValidPassword) {
        return res.status(401).json({ error: "Invalid password" });
      }

      // Verify 2FA token
      const secret = await storage.getTwoFactorSecret(userId);
      if (!secret) {
        return res
          .status(400)
          .json({ error: "Two-factor authentication not enabled" });
      }

      const verified = speakeasy.totp.verify({
        secret,
        encoding: "base32",
        token,
        window: 2,
      });

      if (!verified) {
        return res.status(400).json({ error: "Invalid verification code" });
      }

      // Disable 2FA
      await storage.disableTwoFactor(userId);

      res.json({ message: "Two-factor authentication disabled successfully" });
    } catch (error) {
      console.error("Disable 2FA error:", error);
      res
        .status(500)
        .json({ error: "Failed to disable two-factor authentication" });
    }
  });

  // Two-Factor Authentication verification during sign-in
  app.post("/api/auth/signin-2fa", async (req, res) => {
    try {
      // Check for pending 2FA session
      const pending2FAUserId = (req.session as any).pending2FAUserId;
      if (!pending2FAUserId) {
        return res
          .status(400)
          .json({ error: "No pending two-factor authentication" });
      }

      const result = verifyTwoFactorSchema.safeParse(req.body);
      if (!result.success) {
        const error = fromZodError(result.error);
        return res.status(400).json({ error: error.message });
      }

      const { token, isBackupCode } = result.data;
      const user = await storage.getUser(pending2FAUserId);

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      let verified = false;

      if (isBackupCode) {
        // Verify backup code
        verified = await storage.verifyBackupCode(pending2FAUserId, token);
        if (verified) {
          // Remove used backup code
          await storage.removeUsedBackupCode(pending2FAUserId, token);
        }
      } else {
        // Verify TOTP token
        const secret = await storage.getTwoFactorSecret(pending2FAUserId);
        if (!secret) {
          return res
            .status(400)
            .json({ error: "Two-factor authentication not enabled" });
        }

        verified = speakeasy.totp.verify({
          secret,
          encoding: "base32",
          token,
          window: 2,
        });
      }

      if (!verified) {
        return res.status(401).json({ error: "Invalid verification code" });
      }

      // Update last login
      await storage.updateLastLogin(pending2FAUserId);

      // Complete sign-in: set userId and clear pending2FA
      (req.session as any).userId = pending2FAUserId;
      delete (req.session as any).pending2FAUserId;

      res.json({
        message: "Signed in successfully",
        user: toClientUser(user),
      });
    } catch (error) {
      console.error("2FA verification error:", error);
      res
        .status(500)
        .json({ error: "Failed to verify two-factor authentication" });
    }
  });

  // Save article
  app.post("/api/articles/save", async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const result = saveArticleSchema.safeParse(req.body);
      if (!result.success) {
        const error = fromZodError(result.error);
        return res.status(400).json({ error: error.message });
      }

      const saved = await storage.saveArticle(userId, result.data);
      res.status(201).json({ saved: true, article: saved });
    } catch (error) {
      console.error("Save article error:", error);
      res.status(500).json({ error: "Failed to save article" });
    }
  });

  // Unsave article
  app.delete("/api/articles/save/:articleId", async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const articleId = parseInt(req.params.articleId, 10);
      if (isNaN(articleId)) {
        return res.status(400).json({ error: "Invalid article ID" });
      }

      await storage.unsaveArticle(userId, articleId);
      res.json({ saved: false });
    } catch (error) {
      console.error("Unsave article error:", error);
      res.status(500).json({ error: "Failed to unsave article" });
    }
  });

  // Get saved articles
  app.get("/api/articles/saved", async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const articles = await storage.getSavedArticles(userId);
      res.json({ articles });
    } catch (error) {
      console.error("Get saved articles error:", error);
      res.status(500).json({ error: "Failed to get saved articles" });
    }
  });

  // Get saved article IDs (for checking save status)
  app.get("/api/articles/saved/ids", async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const articleIds = await storage.getSavedArticleIds(userId);
      res.json({ articleIds });
    } catch (error) {
      console.error("Get saved article IDs error:", error);
      res.status(500).json({ error: "Failed to get saved article IDs" });
    }
  });

  // Get user's followed publications
  app.get("/api/follows", requireAuth, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const publicationIds = await storage.getFollows(userId);
      res.json({ publicationIds });
    } catch (error) {
      console.error("Get follows error:", error);
      res.status(500).json({ error: "Failed to get follows" });
    }
  });

  // Follow a publication
  app.post("/api/follows", requireAuth, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const result = insertFollowSchema.safeParse(req.body);
      if (!result.success) {
        return res
          .status(400)
          .json({ error: fromZodError(result.error).message });
      }
      if (!VALID_PUBLICATION_IDS.has(result.data.publicationId)) {
        return res.status(400).json({ error: "Unknown publication" });
      }
      await storage.addFollow(userId, result.data.publicationId);
      res.json({ success: true });
    } catch (error) {
      console.error("Add follow error:", error);
      res.status(500).json({ error: "Failed to follow publication" });
    }
  });

  // Unfollow a publication
  app.delete("/api/follows/:publicationId", requireAuth, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      await storage.removeFollow(userId, req.params.publicationId);
      res.json({ success: true });
    } catch (error) {
      console.error("Remove follow error:", error);
      res.status(500).json({ error: "Failed to unfollow publication" });
    }
  });

  // Upvote an article
  app.post("/api/articles/upvote", async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const result = upvoteArticleSchema.safeParse(req.body);
      if (!result.success) {
        const error = fromZodError(result.error);
        return res.status(400).json({ error: error.message });
      }

      const { articleId, publicationId } = result.data;
      await storage.upvoteArticle(userId, articleId, publicationId);

      // Invalidate upvote cache for this article
      CacheService.invalidateUpvotes(`${publicationId}-${articleId}`);

      res.status(201).json({ success: true, upvoted: true });
    } catch (error) {
      console.error("Upvote article error:", error);
      res.status(500).json({ error: "Failed to upvote article" });
    }
  });

  // Remove upvote from an article
  app.delete("/api/articles/upvote/:articleId", async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const articleId = parseInt(req.params.articleId, 10);
      if (isNaN(articleId)) {
        return res.status(400).json({ error: "Invalid article ID" });
      }

      const publicationId = req.query.publicationId as string;
      if (!publicationId) {
        return res.status(400).json({ error: "Publication ID is required" });
      }

      await storage.removeUpvote(userId, articleId, publicationId);

      // Invalidate upvote cache for this article
      CacheService.invalidateUpvotes(`${publicationId}-${articleId}`);

      res.json({ success: true, upvoted: false });
    } catch (error) {
      console.error("Remove upvote error:", error);
      res.status(500).json({ error: "Failed to remove upvote" });
    }
  });

  // Get user's upvoted article IDs
  app.get("/api/articles/upvoted/ids", async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const upvotedArticles = await storage.getUserUpvotedArticles(userId);
      res.json({ upvotedArticles });
    } catch (error) {
      console.error("Get upvoted article IDs error:", error);
      res.status(500).json({ error: "Failed to get upvoted article IDs" });
    }
  });

  // Get upvote counts for multiple articles (batch)
  app.post("/api/articles/upvote-counts", async (req, res) => {
    try {
      const result = getUpvoteCountsSchema.safeParse(req.body);
      if (!result.success) {
        const error = fromZodError(result.error);
        return res.status(400).json({ error: error.message });
      }

      const { articles } = result.data;

      // Create cache key from article IDs
      const cacheKey = articles
        .map((a) => `${a.publicationId}-${a.articleId}`)
        .sort()
        .join(",");

      // Check cache first
      const cached = CacheService.getUpvoteCounts(cacheKey);
      if (cached) {
        const counts: Record<string, number> = {};
        for (const [key, value] of cached) {
          counts[key] = value;
        }
        return res.json({ counts });
      }

      const countsMap = await storage.getUpvoteCounts(articles);

      // Cache the result
      CacheService.setUpvoteCounts(cacheKey, countsMap);

      // Convert Map to plain object for JSON serialization
      const counts: Record<string, number> = {};
      for (const [key, value] of countsMap) {
        counts[key] = value;
      }

      res.json({ counts });
    } catch (error) {
      console.error("Get upvote counts error:", error);
      res.status(500).json({ error: "Failed to get upvote counts" });
    }
  });

  // Get comments for an article (with author_email for ownership check)
  app.get("/api/comments/article/:postId", async (req, res) => {
    try {
      const postId = parseInt(req.params.postId, 10);
      if (isNaN(postId)) {
        return res.status(400).json({ error: "Invalid post ID" });
      }

      const page = Math.max(
        1,
        Math.min(parseInt(req.query.page as string) || 1, 1000),
      );
      const perPage = Math.max(
        1,
        Math.min(parseInt(req.query.per_page as string) || 20, 100),
      );
      const publicationId = req.query.publication as string | undefined;
      const wpApiBaseUrl = getWpApiBaseUrl(publicationId);

      const wpUsername = process.env.WP_USERNAME;
      const wpPassword = process.env.WP_PASSWORD;

      // Public API without author_email, so the viewer's own comments are not marked
      const sendPublicComments = async () => {
        const response = await wpFetch(
          `${wpApiBaseUrl}/comments?post=${postId}&per_page=${perPage}&page=${page}&order=asc`,
        );
        if (!response.ok) {
          return res
            .status(response.status)
            .json({ error: "Failed to fetch comments" });
        }
        const data = await response.json();
        return res.json({
          comments: await commentsForViewer(data, req, publicationId),
          totalPages: parseInt(
            response.headers.get("X-WP-TotalPages") || "1",
            10,
          ),
        });
      };

      if (!wpUsername || !wpPassword) {
        return sendPublicComments();
      }

      const auth = Buffer.from(`${wpUsername}:${wpPassword}`).toString(
        "base64",
      );

      // Use context=edit to get author_email field (requires authentication)
      const response = await wpFetch(
        `${wpApiBaseUrl}/comments?post=${postId}&per_page=${perPage}&page=${page}&order=asc&context=edit`,
        {
          headers: { Authorization: `Basic ${auth}` },
        },
      );

      if (!response.ok) {
        // SNO sites currently return 500 for any authenticated REST request
        // (seen 2026-10-22), so still show the approved comments.
        console.warn(
          `Authenticated comments fetch failed (${response.status}); using public comments`,
        );
        return sendPublicComments();
      }

      const comments = await commentsForViewer(
        await response.json(),
        req,
        publicationId,
      );
      const totalPages = parseInt(
        response.headers.get("X-WP-TotalPages") || "1",
        10,
      );

      res.json({ comments, totalPages });
    } catch (error) {
      console.error("Get article comments error:", error);
      res.status(500).json({ error: "Failed to fetch comments" });
    }
  });

  // Post comment to WordPress
  app.post("/api/comments", async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      if (!userId) {
        return res
          .status(401)
          .json({ error: "You must be signed in to comment" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }
      if (user.suspendedAt) {
        return res.status(403).json({
          error: "This account has been suspended and cannot comment.",
        });
      }

      const result = postCommentSchema.safeParse(req.body);
      if (!result.success) {
        const error = fromZodError(result.error);
        return res.status(400).json({ error: error.message });
      }

      const { postId, content, parentId, publicationId } = result.data;
      const wpApiBaseUrl = getWpApiBaseUrl(publicationId);

      const wpUsername = process.env.WP_USERNAME;
      const wpPassword = process.env.WP_PASSWORD;

      if (!wpUsername || !wpPassword) {
        console.error("WordPress API credentials not configured");
        return res
          .status(500)
          .json({ error: "Comment posting is not configured" });
      }

      const auth = Buffer.from(`${wpUsername}:${wpPassword}`).toString(
        "base64",
      );

      const authorName = user.displayName || user.email.split("@")[0];
      const authorEmail = user.email;

      const commentData: Record<string, any> = {
        post: postId,
        content: content,
        author_name: authorName,
        author_email: authorEmail,
        status: "hold",
      };

      if (parentId) {
        commentData.parent = parentId;
      }

      const wpResponse = await wpFetch(`${wpApiBaseUrl}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${auth}`,
        },
        body: JSON.stringify(commentData),
      });

      if (!wpResponse.ok) {
        const errorData = await wpResponse.json().catch(() => ({}));
        console.error("WordPress comment error:", errorData);
        return res.status(wpResponse.status).json({
          error: errorData.message || "Failed to submit comment",
        });
      }

      const comment = await wpResponse.json();
      res.status(201).json({
        success: true,
        message: "Your comment has been submitted and is awaiting moderation",
        comment,
      });
    } catch (error) {
      console.error("Post comment error:", error);
      res.status(500).json({ error: "Failed to submit comment" });
    }
  });

  // Edit comment on WordPress
  app.patch("/api/comments/:commentId", async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      if (!userId) {
        return res
          .status(401)
          .json({ error: "You must be signed in to edit comments" });
      }

      const user = await storage.getSafeUser(userId);
      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }

      const commentId = parseInt(req.params.commentId, 10);
      if (isNaN(commentId)) {
        return res.status(400).json({ error: "Invalid comment ID" });
      }

      const result = editCommentSchema.safeParse(req.body);
      if (!result.success) {
        const error = fromZodError(result.error);
        return res.status(400).json({ error: error.message });
      }

      const { content, publicationId } = result.data;
      const wpApiBaseUrl = getWpApiBaseUrl(publicationId);

      const wpUsername = process.env.WP_USERNAME;
      const wpPassword = process.env.WP_PASSWORD;

      if (!wpUsername || !wpPassword) {
        return res
          .status(500)
          .json({ error: "Comment editing is not configured" });
      }

      const auth = Buffer.from(`${wpUsername}:${wpPassword}`).toString(
        "base64",
      );

      // First fetch the comment to verify ownership (use context=edit to get author_email)
      const fetchResponse = await wpFetch(
        `${wpApiBaseUrl}/comments/${commentId}?context=edit`,
        {
          headers: { Authorization: `Basic ${auth}` },
        },
      );

      if (!fetchResponse.ok) {
        return res.status(404).json({ error: "Comment not found" });
      }

      const existingComment = await fetchResponse.json();

      // Verify ownership by email
      if (existingComment.author_email !== user.email) {
        console.log(
          `Ownership check failed: comment email="${existingComment.author_email}", user email="${user.email}"`,
        );
        return res
          .status(403)
          .json({ error: "You can only edit your own comments" });
      }

      // Add "(Edited)" marker to content
      const editedContent = content.trim() + "\n\n<em>(Edited)</em>";

      // Update the comment with status 'hold' for re-moderation
      const wpResponse = await wpFetch(`${wpApiBaseUrl}/comments/${commentId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${auth}`,
        },
        body: JSON.stringify({
          content: editedContent,
          status: "hold",
        }),
      });

      if (!wpResponse.ok) {
        const errorData = await wpResponse.json().catch(() => ({}));
        console.error("WordPress edit comment error:", errorData);
        return res.status(wpResponse.status).json({
          error: errorData.message || "Failed to edit comment",
        });
      }

      const comment = await wpResponse.json();
      res.json({
        success: true,
        message: "Your comment has been updated and is awaiting re-approval",
        comment,
      });
    } catch (error) {
      console.error("Edit comment error:", error);
      res.status(500).json({ error: "Failed to edit comment" });
    }
  });

  // Delete comment on WordPress
  app.delete("/api/comments/:commentId", async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      if (!userId) {
        return res
          .status(401)
          .json({ error: "You must be signed in to delete comments" });
      }

      const user = await storage.getSafeUser(userId);
      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }

      const commentId = parseInt(req.params.commentId, 10);
      if (isNaN(commentId)) {
        return res.status(400).json({ error: "Invalid comment ID" });
      }

      const publicationId = req.query.publication as string | undefined;
      const wpApiBaseUrl = getWpApiBaseUrl(publicationId);

      const wpUsername = process.env.WP_USERNAME;
      const wpPassword = process.env.WP_PASSWORD;

      if (!wpUsername || !wpPassword) {
        return res
          .status(500)
          .json({ error: "Comment deletion is not configured" });
      }

      const auth = Buffer.from(`${wpUsername}:${wpPassword}`).toString(
        "base64",
      );

      // First fetch the comment to verify ownership (use context=edit to get author_email)
      const fetchResponse = await wpFetch(
        `${wpApiBaseUrl}/comments/${commentId}?context=edit`,
        {
          headers: { Authorization: `Basic ${auth}` },
        },
      );

      if (!fetchResponse.ok) {
        return res.status(404).json({ error: "Comment not found" });
      }

      const existingComment = await fetchResponse.json();

      // Verify ownership by email
      if (existingComment.author_email !== user.email) {
        console.log(
          `Delete ownership check failed: comment email="${existingComment.author_email}", user email="${user.email}"`,
        );
        return res
          .status(403)
          .json({ error: "You can only delete your own comments" });
      }

      // Delete the comment
      const wpResponse = await wpFetch(
        `${wpApiBaseUrl}/comments/${commentId}?force=true`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Basic ${auth}`,
          },
        },
      );

      if (!wpResponse.ok) {
        const errorData = await wpResponse.json().catch(() => ({}));
        console.error("WordPress delete comment error:", errorData);
        return res.status(wpResponse.status).json({
          error: errorData.message || "Failed to delete comment",
        });
      }

      res.json({
        success: true,
        message: "Comment deleted successfully",
      });
    } catch (error) {
      console.error("Delete comment error:", error);
      res.status(500).json({ error: "Failed to delete comment" });
    }
  });

  // Get user's comments from WordPress
  // Note: This fetches from all publications to show all user comments
  app.get("/api/comments/mine", async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const user = await storage.getSafeUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const wpUsername = process.env.WP_USERNAME;
      const wpPassword = process.env.WP_PASSWORD;

      if (!wpUsername || !wpPassword) {
        return res
          .status(500)
          .json({ error: "Comment fetching is not configured" });
      }

      const auth = Buffer.from(`${wpUsername}:${wpPassword}`).toString(
        "base64",
      );

      // Fetch comments from all publications
      const statuses = ["approve", "hold", "spam"];
      const allComments: any[] = [];

      // For now, fetch from all publications
      for (const pubConfig of PUBLICATION_CONFIGS) {
        for (const status of statuses) {
          try {
            const wpResponse = await wpFetch(
              `${pubConfig.wpApiBaseUrl}/comments?per_page=100&status=${status}&context=edit`,
              {
                headers: { Authorization: `Basic ${auth}` },
              },
            );

            if (wpResponse.ok) {
              const comments = await wpResponse.json();
              // Add publication info to each comment
              const commentsWithPub = comments.map((c: any) => ({
                ...c,
                publicationId: pubConfig.id,
                publicationName: pubConfig.name,
              }));
              allComments.push(...commentsWithPub);
            }
          } catch (err) {
            // Continue if a publication fails
            console.error(
              `Failed to fetch comments from ${pubConfig.name}:`,
              err,
            );
          }
        }
      }

      // Filter to only include comments by this user's email
      const userComments = allComments.filter(
        (comment: any) => comment.author_email === user.email,
      );

      res.json({ comments: userComments });
    } catch (error) {
      console.error("Get user comments error:", error);
      res.status(500).json({ error: "Failed to get comments" });
    }
  });

  // ==========================================
  // Push Notification Endpoints
  // ==========================================

  // Get notification preferences
  app.get("/api/notifications/preferences", async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const preferences = await storage.getNotificationPreferences(userId);

      // Return preferences keyed by publicationId for easy client access
      const preferencesMap: Record<string, any> = {};
      for (const pref of preferences) {
        preferencesMap[pref.publicationId] = pref;
      }

      res.json({ preferences: preferencesMap });
    } catch (error) {
      console.error("Get notification preferences error:", error);
      res.status(500).json({ error: "Failed to get notification preferences" });
    }
  });

  // Update notification preference
  app.put("/api/notifications/preferences", async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const result = updateNotificationPreferenceSchema.safeParse(req.body);
      if (!result.success) {
        const error = fromZodError(result.error);
        return res.status(400).json({ error: error.message });
      }

      const preference = await storage.upsertNotificationPreference(
        userId,
        result.data,
      );
      res.json({ success: true, preference });
    } catch (error) {
      console.error("Update notification preference error:", error);
      res
        .status(500)
        .json({ error: "Failed to update notification preference" });
    }
  });

  // Update weekly digest email preference
  app.put("/api/notifications/weekly-digest", async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const result = updateWeeklyDigestPreferenceSchema.safeParse(req.body);
      if (!result.success) {
        const error = fromZodError(result.error);
        return res.status(400).json({ error: error.message });
      }

      await storage.updateWeeklyDigestPreference(userId, result.data.enabled);
      res.json({ success: true, enabled: result.data.enabled });
    } catch (error) {
      console.error("Update weekly digest preference error:", error);
      res
        .status(500)
        .json({ error: "Failed to update weekly digest preference" });
    }
  });

  app.put("/api/notifications/push-token", async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const result = registerPushTokenSchema.safeParse(req.body);
      if (!result.success) {
        const error = fromZodError(result.error);
        return res.status(400).json({ error: error.message });
      }

      await storage.upsertPushNotificationDevice(userId, result.data);
      res.json({ success: true });
    } catch (error) {
      console.error("Register push token error:", error);
      res.status(500).json({ error: "Failed to register push token" });
    }
  });

  app.delete("/api/notifications/push-token", async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const result = registerPushTokenSchema
        .pick({ token: true })
        .safeParse(req.body);
      if (!result.success) {
        const error = fromZodError(result.error);
        return res.status(400).json({ error: error.message });
      }

      await storage.deletePushNotificationDeviceByToken(result.data.token);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete push token error:", error);
      res.status(500).json({ error: "Failed to delete push token" });
    }
  });

  // ==========================================
  // Bell Schedule Endpoint
  // ==========================================

  // Helper function to parse Paly.net schedule HTML
  function parseScheduleHtml(html: string) {
    const periods: Array<{
      period: string | number;
      start: string;
      end: string;
    }> = [];

    // Extract schedule title
    const titleMatch = html.match(
      /<div class="fsTitle[^"]*"[^>]*>[\s\S]*?<\/span>\s*([^<]+)/,
    );
    const scheduleTitle = titleMatch ? titleMatch[1].trim() : null;

    // Extract description containing the periods
    const descMatch = html.match(
      /<div class="fsDescription">([\s\S]*?)<\/div>/,
    );
    if (!descMatch) {
      return { scheduleTitle, periods: [], scheduleType: null };
    }

    const description = descMatch[1];

    // Extract schedule type from color icon
    const typeMatch = html.match(/title='([^']+)'/);
    const scheduleType = typeMatch ? typeMatch[1].trim() : null;

    // Convert a 12-hour time string (no AM/PM) to 24-hour "HH:MM" format.
    // Paly's bell schedule runs ~7:55 AM – 3:50 PM, so hours < 7 are PM.
    function to24Hour(t: string): string {
      const [h, m] = t.split(":").map(Number);
      const hour24 = h < 7 ? h + 12 : h; // 1-6 → 13-18 (PM)
      return `${String(hour24).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    }

    // Parse each period line
    const periodRegex = /<p>([^<(]+)\(([^)]+)\)<\/p>/g;
    let match;

    while ((match = periodRegex.exec(description)) !== null) {
      const periodName = match[1].trim();
      const timeRange = match[2].trim();

      // Parse time range (e.g., "7:55-8:50" or "3:05-3:50")
      const times = timeRange.split("-").map((t) => t.trim());
      if (times.length === 2) {
        periods.push({
          period: periodName.replace(/^Period\s+/i, "").trim(),
          start: to24Hour(times[0]),
          end: to24Hour(times[1]),
        });
      }
    }

    return { scheduleTitle, scheduleType, periods };
  }

  // Get today's bell schedule from Paly.net
  app.get("/api/schedule/today", async (req, res) => {
    try {
      const dateParam = req.query.date as string;
      const targetDate = dateParam ? new Date(dateParam) : new Date();

      // Format date for the API (YYYY-MM-DD)
      const year = targetDate.getFullYear();
      const month = String(targetDate.getMonth() + 1).padStart(2, "0");
      const day = String(targetDate.getDate()).padStart(2, "0");
      const dateStr = `${year}-${month}-${day}`;
      const nextDay = new Date(targetDate);
      nextDay.setDate(nextDay.getDate() + 1);
      const nextDayStr = `${nextDay.getFullYear()}-${String(nextDay.getMonth() + 1).padStart(2, "0")}-${String(nextDay.getDate()).padStart(2, "0")}`;

      // Check cache first (cache for 1 hour)
      const cached = CacheService.getScheduleData(dateStr);
      if (cached !== undefined) {
        return res.json(cached);
      }

      // The occur_id is not predictable by a simple formula - it appears to be
      // internal calendar event IDs from Finalsite. We need to extract it from the calendar page.

      // Fetch the calendar page to extract the occur_id
      const calendarUrl = `https://www.paly.net/campus-life/calendars?cal_date=${dateStr}`;
      let occurId = null;

      try {
        const calendarResponse = await fetch(calendarUrl, {
          headers: {
            accept: "text/html",
            "user-agent":
              "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
          },
        });

        if (calendarResponse.ok) {
          const calendarHtml = await calendarResponse.text();
          // Look for data-occur-id in the calendar HTML
          // Pattern: data-occur-id="XXXXX_YYYY-MM-DDT00:00:00Z_YYYY-MM-DDT00:00:00Z"
          // We need to find the event for our specific date
          const occurIdPattern = new RegExp(
            `data-occur-id="(\\d+)_${dateStr.replace(/-/g, "\\-")}T00:00:00Z_${nextDayStr.replace(/-/g, "\\-")}T00:00:00Z"`,
            "i",
          );
          const occurIdMatch = calendarHtml.match(occurIdPattern);
          if (occurIdMatch) {
            occurId =
              occurIdMatch[1] +
              "_" +
              dateStr +
              "T00%3A00%3A00Z_" +
              nextDayStr +
              "T00%3A00%3A00Z";
          }
        }
      } catch (err) {
        console.error("Failed to extract occur_id from calendar:", err);
      }

      // If we couldn't extract occur_id, try without it or use a fallback
      if (!occurId) {
        // Fallback: try fetching without occur_id parameter
        const urlWithoutOccurId = `https://www.paly.net/fs/elements/23682?cal_date=${dateStr}&show_event=true&show_ath_event=false&is_draft=false&_=${Date.now()}`;

        try {
          const fallbackResponse = await fetch(urlWithoutOccurId, {
            headers: {
              accept: "*/*",
              "user-agent":
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
            },
          });

          if (fallbackResponse.ok) {
            const html = await fallbackResponse.text();
            // Try to parse and return schedule data
            const parsed = parseScheduleHtml(html);
            const scheduleData = {
              date: dateStr,
              scheduleTitle: parsed.scheduleTitle,
              scheduleType: parsed.scheduleType,
              periods: parsed.periods,
              hasSchedule: parsed.periods.length > 0,
            };
            if (scheduleData.hasSchedule) {
              CacheService.setScheduleData(dateStr, scheduleData);
              return res.json(scheduleData);
            }
          }
        } catch (fallbackErr) {
          console.error("Fallback fetch failed:", fallbackErr);
        }

        // If all else fails, return no schedule
        return res.json({
          date: dateStr,
          scheduleTitle: null,
          scheduleType: null,
          periods: [],
          hasSchedule: false,
        });
      }

      // Build the Paly.net API URL with extracted occur_id
      const url = `https://www.paly.net/fs/elements/23682?occur_id=${occurId}&show_event=true&show_ath_event=false&is_draft=false&_=${Date.now()}`;

      const response = await fetch(url, {
        headers: {
          accept: "*/*",
          "user-agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        },
      });

      if (!response.ok) {
        return res
          .status(response.status)
          .json({ error: "Failed to fetch schedule from Paly.net" });
      }

      const html = await response.text();

      // Parse the HTML
      const { scheduleTitle, scheduleType, periods } = parseScheduleHtml(html);

      const result = {
        date: dateStr,
        scheduleTitle,
        scheduleType,
        periods,
        hasSchedule: periods.length > 0,
      };

      // Cache the result for 1 hour
      CacheService.setScheduleData(dateStr, result);

      res.json(result);
    } catch (error) {
      console.error("Get schedule error:", error);
      res.status(500).json({ error: "Failed to fetch schedule" });
    }
  });

  // GET /api/paly-calendar/events - public PALY school calendar events
  app.get("/api/paly-calendar/events", async (req, res) => {
    try {
      const now = new Date();
      const defaultMax = new Date(now.getTime() + 31 * 24 * 60 * 60 * 1000);
      const timeMin = (req.query.timeMin as string) || now.toISOString();
      const timeMax = (req.query.timeMax as string) || defaultMax.toISOString();
      const monthStarts = getPalyCalendarMonthStarts(timeMin, timeMax);

      if (monthStarts.length === 0) {
        return res.status(400).json({ error: "Invalid calendar range" });
      }

      const allEvents: any[] = [];

      for (const monthStart of monthStarts) {
        const monthKey = monthStart.slice(0, 7);
        let events = CacheService.getPalyCalendarData(monthKey);

        if (!events) {
          const response = await fetch(getPalyCalendarMonthUrl(monthStart), {
            headers: {
              accept: "*/*",
              referer: "https://www.paly.net/campus-life/calendars",
              "user-agent":
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
              "x-requested-with": "XMLHttpRequest",
            },
          });

          if (!response.ok) {
            return res
              .status(response.status)
              .json({ error: "Failed to fetch PALY calendar" });
          }

          const html = await response.text();
          events = parsePalyCalendarHtml(html);
          CacheService.setPalyCalendarData(monthKey, events);
        }

        allEvents.push(...events);
      }

      res.json({
        events: filterPalyCalendarEvents(allEvents, timeMin, timeMax),
      });
    } catch (error) {
      console.error("PALY calendar events error:", error);
      res.status(500).json({ error: "Failed to fetch PALY calendar events" });
    }
  });

  // GET /api/paly-calendar/events/:eventId/details - public PALY event details
  app.get("/api/paly-calendar/events/:eventId/details", async (req, res) => {
    try {
      const occurId = req.query.occurId as string | undefined;

      if (!occurId) {
        return res.status(400).json({ error: "Missing occurrence id" });
      }

      const response = await fetch(getPalyCalendarEventDetailsUrl(occurId), {
        headers: {
          accept: "*/*",
          referer: "https://www.paly.net/campus-life/calendars",
          "user-agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
          "x-requested-with": "XMLHttpRequest",
        },
      });

      if (!response.ok) {
        return res
          .status(response.status)
          .json({ error: "Failed to fetch PALY calendar event details" });
      }

      const html = await response.text();
      res.json({ details: parsePalyCalendarEventDetailsHtml(html) });
    } catch (error) {
      console.error("PALY calendar event details error:", error);
      res
        .status(500)
        .json({ error: "Failed to fetch PALY calendar event details" });
    }
  });

  // ==========================================
  // Manual Classes (User Schedule) Endpoints
  // ==========================================

  // GET /api/classes - get authenticated user's manual classes
  app.get("/api/classes", async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const classes = await storage.getManualClasses(userId);
      res.json(classes);
    } catch (error) {
      console.error("Get classes error:", error);
      res.status(500).json({ error: "Failed to get classes" });
    }
  });

  // POST /api/classes - create a new manual class
  app.post("/api/classes", async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const parsed = insertManualClassSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.issues[0].message });
      }

      const created = await storage.createManualClass(userId, parsed.data);
      res.status(201).json(created);
    } catch (error) {
      console.error("Create class error:", error);
      res.status(500).json({ error: "Failed to create class" });
    }
  });

  // PUT /api/classes/:id - update a manual class
  app.put("/api/classes/:id", async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const updated = await storage.updateManualClass(
        req.params.id,
        userId,
        req.body,
      );
      if (!updated) {
        return res.status(404).json({ error: "Class not found" });
      }

      res.json(updated);
    } catch (error) {
      console.error("Update class error:", error);
      res.status(500).json({ error: "Failed to update class" });
    }
  });

  // DELETE /api/classes/:id - delete a manual class
  app.delete("/api/classes/:id", async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      await storage.deleteManualClass(req.params.id, userId);
      res.status(204).send();
    } catch (error) {
      console.error("Delete class error:", error);
      res.status(500).json({ error: "Failed to delete class" });
    }
  });

  // ==========================================
  // Todo Routes
  // ==========================================

  // GET /api/todos - get all todos for authenticated user
  app.get("/api/todos", async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const todoList = await storage.getTodos(userId);
      res.json(todoList);
    } catch (error) {
      console.error("Get todos error:", error);
      res.status(500).json({ error: "Failed to get todos" });
    }
  });

  // GET /api/todos/upcoming - get upcoming incomplete todos for dashboard
  app.get("/api/todos/upcoming", async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const todoList = await storage.getUpcomingTodos(userId);
      res.json(todoList);
    } catch (error) {
      console.error("Get upcoming todos error:", error);
      res.status(500).json({ error: "Failed to get upcoming todos" });
    }
  });

  // POST /api/todos - create a new todo
  app.post("/api/todos", async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const result = insertTodoSchema.safeParse(req.body);
      if (!result.success) {
        const error = fromZodError(result.error);
        return res.status(400).json({ error: error.message });
      }
      const { title, description, dueDate, priority } = result.data;
      const todo = await storage.createTodo(userId, {
        title,
        description,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        priority,
      });
      res.status(201).json(todo);
    } catch (error) {
      console.error("Create todo error:", error);
      res.status(500).json({ error: "Failed to create todo" });
    }
  });

  // PUT /api/todos/:id - update a todo
  app.put("/api/todos/:id", async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const result = updateTodoSchema.safeParse(req.body);
      if (!result.success) {
        const error = fromZodError(result.error);
        return res.status(400).json({ error: error.message });
      }
      const data: Record<string, unknown> = {};
      if (result.data.title !== undefined) data.title = result.data.title;
      if (result.data.description !== undefined)
        data.description = result.data.description;
      if (result.data.dueDate !== undefined)
        data.dueDate = result.data.dueDate
          ? new Date(result.data.dueDate)
          : null;
      if (result.data.completed !== undefined)
        data.completed = result.data.completed;
      if (result.data.priority !== undefined)
        data.priority = result.data.priority;

      const todo = await storage.updateTodo(req.params.id, userId, data as any);
      if (!todo) {
        return res.status(404).json({ error: "Todo not found" });
      }
      res.json(todo);
    } catch (error) {
      console.error("Update todo error:", error);
      res.status(500).json({ error: "Failed to update todo" });
    }
  });

  // DELETE /api/todos/:id - delete a todo
  app.delete("/api/todos/:id", async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      await storage.deleteTodo(req.params.id, userId);
      res.status(204).send();
    } catch (error) {
      console.error("Delete todo error:", error);
      res.status(500).json({ error: "Failed to delete todo" });
    }
  });

  // PATCH /api/todos/:id/toggle - toggle todo completed status
  app.patch("/api/todos/:id/toggle", async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const todo = await storage.toggleTodo(req.params.id, userId);
      if (!todo) {
        return res.status(404).json({ error: "Todo not found" });
      }
      res.json(todo);
    } catch (error) {
      console.error("Toggle todo error:", error);
      res.status(500).json({ error: "Failed to toggle todo" });
    }
  });

  // ==========================================
  // Google Calendar Proxy Routes
  // ==========================================

  // GET /api/calendar/events - fetch events from multiple Google Calendar accounts
  app.get("/api/calendar/events", async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const timeMin = (req.query.timeMin as string) || new Date().toISOString();
      const timeMax =
        (req.query.timeMax as string) ||
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

      // Get all enabled calendar accounts
      const accounts = await storage.getCalendarAccounts(userId);
      const enabledAccounts = accounts.filter((acc) => acc.isEnabled);

      if (enabledAccounts.length === 0) {
        return res.json({ events: [], noAccounts: true });
      }

      // Get calendar preferences to know which calendars to include
      const preferences = await storage.getCalendarPreferences(userId);
      const enabledCalendarIds = new Set(
        preferences
          .filter((p) => p.isEnabled)
          .map((p) => `${p.accountId}:${p.calendarId}`),
      );

      // Fetch events from all enabled accounts and calendars
      const allEvents: any[] = [];
      let hasTokenError = false;

      for (const account of enabledAccounts) {
        try {
          // Get list of calendars for this account
          const calendarListUrl =
            "https://www.googleapis.com/calendar/v3/users/me/calendarList";
          const calListRes = await fetch(calendarListUrl, {
            headers: { Authorization: `Bearer ${account.accessToken}` },
          });

          if (calListRes.status === 401) {
            hasTokenError = true;
            continue; // Skip this account
          }

          if (!calListRes.ok) continue;

          const calListData = await calListRes.json();
          const calendars = calListData.items || [];

          // Fetch events from each calendar
          for (const calendar of calendars) {
            const calendarKey = `${account.id}:${calendar.id}`;

            // Skip if calendar is not in preferences (treat as enabled by default if no preference)
            const hasPref = preferences.some(
              (p) => p.accountId === account.id && p.calendarId === calendar.id,
            );
            if (hasPref && !enabledCalendarIds.has(calendarKey)) {
              continue; // Calendar is explicitly disabled
            }

            // Fetch events for this calendar
            const eventsUrl = new URL(
              `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendar.id)}/events`,
            );
            eventsUrl.searchParams.set("timeMin", timeMin);
            eventsUrl.searchParams.set("timeMax", timeMax);
            eventsUrl.searchParams.set("maxResults", "50");
            eventsUrl.searchParams.set("singleEvents", "true");
            eventsUrl.searchParams.set("orderBy", "startTime");

            const eventsRes = await fetch(eventsUrl.toString(), {
              headers: { Authorization: `Bearer ${account.accessToken}` },
            });

            if (!eventsRes.ok) continue;

            const eventsData = await eventsRes.json();
            const events = (eventsData.items || []).map((item: any) => ({
              id: `${account.id}:${calendar.id}:${item.id}`,
              googleEventId: item.id,
              calendarId: calendar.id,
              calendarName: calendar.summary || "Calendar",
              calendarColor: calendar.backgroundColor || "#3B82F6",
              accountId: account.id,
              accountEmail: account.accountEmail,
              title: item.summary || "Untitled",
              description: item.description || null,
              startTime: item.start?.dateTime || item.start?.date || null,
              endTime: item.end?.dateTime || item.end?.date || null,
              allDay: !!item.start?.date && !item.start?.dateTime,
              location: item.location || null,
              source: "google",
            }));

            allEvents.push(...events);
          }
        } catch (err) {
          console.error(
            `Error fetching events for account ${account.id}:`,
            err,
          );
          continue;
        }
      }

      // Sort all events by start time
      allEvents.sort((a, b) => {
        const aTime = new Date(a.startTime).getTime();
        const bTime = new Date(b.startTime).getTime();
        return aTime - bTime;
      });

      if (hasTokenError && allEvents.length === 0) {
        return res.status(401).json({ error: "token_expired" });
      }

      res.json({ events: allEvents });
    } catch (error) {
      console.error("Calendar events error:", error);
      res.status(500).json({ error: "Failed to fetch calendar events" });
    }
  });

  // POST /api/calendar/events - create event in Google Calendar
  app.post("/api/calendar/events", async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      // Get primary calendar account
      const accounts = await storage.getCalendarAccounts(userId);
      const primaryAccount = accounts.find((acc) => acc.isPrimary);
      if (!primaryAccount) {
        return res.status(400).json({ error: "No calendar account found" });
      }

      const { title, description, startTime, endTime, allDay, location } =
        req.body;
      if (!title || !startTime) {
        return res
          .status(400)
          .json({ error: "Title and start time are required" });
      }

      const event: Record<string, unknown> = {
        summary: title,
        description: description || undefined,
        location: location || undefined,
      };

      if (allDay) {
        // All-day events use date (YYYY-MM-DD), not dateTime
        event.start = { date: startTime.split("T")[0] };
        event.end = {
          date: endTime ? endTime.split("T")[0] : startTime.split("T")[0],
        };
      } else {
        event.start = { dateTime: startTime, timeZone: "America/Los_Angeles" };
        event.end = {
          dateTime: endTime || startTime,
          timeZone: "America/Los_Angeles",
        };
      }

      const googleRes = await fetch(
        "https://www.googleapis.com/calendar/v3/calendars/primary/events",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${primaryAccount.accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(event),
        },
      );

      if (googleRes.status === 401) {
        return res.status(401).json({ error: "token_expired" });
      }

      if (!googleRes.ok) {
        const errorText = await googleRes.text();
        console.error("Google Calendar create error:", errorText);
        return res
          .status(500)
          .json({ error: "Failed to create calendar event" });
      }

      const created = await googleRes.json();
      res.status(201).json({
        id: created.id,
        title: created.summary || "Untitled",
        description: created.description || null,
        startTime: created.start?.dateTime || created.start?.date || null,
        endTime: created.end?.dateTime || created.end?.date || null,
        allDay: !!created.start?.date && !created.start?.dateTime,
        location: created.location || null,
        source: "google",
      });
    } catch (error) {
      console.error("Create calendar event error:", error);
      res.status(500).json({ error: "Failed to create calendar event" });
    }
  });

  // PUT /api/calendar/events/:eventId - update event in Google Calendar
  app.put("/api/calendar/events/:eventId", async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      // Get primary calendar account
      const accounts = await storage.getCalendarAccounts(userId);
      const primaryAccount = accounts.find((acc) => acc.isPrimary);
      if (!primaryAccount) {
        return res.status(400).json({ error: "No calendar account found" });
      }

      const { title, description, startTime, endTime, allDay, location } =
        req.body;

      const event: Record<string, unknown> = {};
      if (title !== undefined) event.summary = title;
      if (description !== undefined) event.description = description;
      if (location !== undefined) event.location = location;

      if (startTime) {
        if (allDay) {
          event.start = { date: startTime.split("T")[0] };
          event.end = {
            date: endTime ? endTime.split("T")[0] : startTime.split("T")[0],
          };
        } else {
          event.start = {
            dateTime: startTime,
            timeZone: "America/Los_Angeles",
          };
          event.end = {
            dateTime: endTime || startTime,
            timeZone: "America/Los_Angeles",
          };
        }
      }

      const googleRes = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(req.params.eventId)}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${primaryAccount.accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(event),
        },
      );

      if (googleRes.status === 401) {
        return res.status(401).json({ error: "token_expired" });
      }

      if (!googleRes.ok) {
        const errorText = await googleRes.text();
        console.error("Google Calendar update error:", errorText);
        return res
          .status(500)
          .json({ error: "Failed to update calendar event" });
      }

      const updated = await googleRes.json();
      res.json({
        id: updated.id,
        title: updated.summary || "Untitled",
        description: updated.description || null,
        startTime: updated.start?.dateTime || updated.start?.date || null,
        endTime: updated.end?.dateTime || updated.end?.date || null,
        allDay: !!updated.start?.date && !updated.start?.dateTime,
        location: updated.location || null,
        source: "google",
      });
    } catch (error) {
      console.error("Update calendar event error:", error);
      res.status(500).json({ error: "Failed to update calendar event" });
    }
  });

  // DELETE /api/calendar/events/:eventId - delete event from Google Calendar
  app.delete("/api/calendar/events/:eventId", async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      // Get primary calendar account
      const accounts = await storage.getCalendarAccounts(userId);
      const primaryAccount = accounts.find((acc) => acc.isPrimary);
      if (!primaryAccount) {
        return res.status(400).json({ error: "No calendar account found" });
      }

      const googleRes = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(req.params.eventId)}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${primaryAccount.accessToken}` },
        },
      );

      if (googleRes.status === 401) {
        return res.status(401).json({ error: "token_expired" });
      }

      if (!googleRes.ok && googleRes.status !== 204) {
        const errorText = await googleRes.text();
        console.error("Google Calendar delete error:", errorText);
        return res
          .status(500)
          .json({ error: "Failed to delete calendar event" });
      }

      res.status(204).send();
    } catch (error) {
      console.error("Delete calendar event error:", error);
      res.status(500).json({ error: "Failed to delete calendar event" });
    }
  });

  // POST /api/calendar/refresh-token - update stored Google access token
  app.post("/api/calendar/refresh-token", async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { accessToken } = req.body;
      if (!accessToken) {
        return res.status(400).json({ error: "Access token is required" });
      }

      await storage.updateUserGoogleAccessToken(userId, accessToken);
      res.json({ success: true });
    } catch (error) {
      console.error("Refresh token error:", error);
      res.status(500).json({ error: "Failed to update token" });
    }
  });

  // GET /api/calendar/accounts - Get all calendar accounts for user
  app.get("/api/calendar/accounts", async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      let accounts = await storage.getCalendarAccounts(userId);

      // Auto-migrate: If user has no accounts but is a Google user, create primary account
      if (accounts.length === 0) {
        const user = await storage.getUser(userId);
        if (user?.googleId && user?.googleAccessToken) {
          try {
            const primaryAccount = await storage.createCalendarAccount(userId, {
              accountEmail: user.email,
              accountName: user.displayName || undefined,
              accessToken: decryptNullable(user.googleAccessToken)!,
              refreshToken:
                decryptNullable(user.googleRefreshToken) || undefined,
              isPrimary: true,
            });
            accounts = [primaryAccount];
            console.log(
              `Auto-created primary calendar account for user ${userId}`,
            );
          } catch (err) {
            console.error("Error creating primary calendar account:", err);
          }
        }
      }

      // Don't send tokens to client
      const safeAccounts = accounts.map((acc) => ({
        id: acc.id,
        accountEmail: acc.accountEmail,
        accountName: acc.accountName,
        isEnabled: acc.isEnabled,
        isPrimary: acc.isPrimary,
        createdAt: acc.createdAt,
      }));
      res.json(safeAccounts);
    } catch (error) {
      console.error("Get calendar accounts error:", error);
      res.status(500).json({ error: "Failed to fetch calendar accounts" });
    }
  });

  // POST /api/calendar/accounts - Add a new calendar account
  app.post("/api/calendar/accounts", async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { accountEmail, accountName, accessToken, refreshToken } = req.body;
      if (!accountEmail || !accessToken) {
        return res
          .status(400)
          .json({ error: "Account email and access token are required" });
      }

      const account = await storage.createCalendarAccount(userId, {
        accountEmail,
        accountName,
        accessToken,
        refreshToken,
      });

      res.json({
        id: account.id,
        accountEmail: account.accountEmail,
        accountName: account.accountName,
        isEnabled: account.isEnabled,
        isPrimary: account.isPrimary,
      });
    } catch (error) {
      console.error("Add calendar account error:", error);
      res.status(500).json({ error: "Failed to add calendar account" });
    }
  });

  // PATCH /api/calendar/accounts/:id/toggle - Toggle calendar account on/off
  app.patch("/api/calendar/accounts/:id/toggle", async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { id } = req.params;
      const updated = await storage.toggleCalendarAccount(id, userId);
      if (!updated) {
        return res.status(404).json({ error: "Calendar account not found" });
      }

      res.json({
        id: updated.id,
        accountEmail: updated.accountEmail,
        accountName: updated.accountName,
        isEnabled: updated.isEnabled,
        isPrimary: updated.isPrimary,
      });
    } catch (error) {
      console.error("Toggle calendar account error:", error);
      res.status(500).json({ error: "Failed to toggle calendar account" });
    }
  });

  // DELETE /api/calendar/accounts/:id - Delete calendar account
  app.delete("/api/calendar/accounts/:id", async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { id } = req.params;
      await storage.deleteCalendarAccount(id, userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete calendar account error:", error);
      res.status(500).json({ error: "Failed to delete calendar account" });
    }
  });

  // GET /api/calendar/accounts/:id/calendars - Fetch list of calendars from Google for this account
  app.get("/api/calendar/accounts/:id/calendars", async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { id } = req.params;
      const account = await storage.getCalendarAccount(id, userId);
      if (!account) {
        return res.status(404).json({ error: "Calendar account not found" });
      }

      // Fetch calendar list from Google Calendar API
      const url =
        "https://www.googleapis.com/calendar/v3/users/me/calendarList";
      const googleRes = await fetch(url, {
        headers: { Authorization: `Bearer ${account.accessToken}` },
      });

      if (googleRes.status === 401) {
        return res.status(401).json({ error: "token_expired" });
      }

      if (!googleRes.ok) {
        throw new Error(`Google Calendar API error: ${googleRes.statusText}`);
      }

      const data = await googleRes.json();
      const calendars = data.items.map((cal: any) => ({
        id: cal.id,
        name: cal.summary,
        color: cal.backgroundColor,
        primary: cal.primary || false,
      }));

      res.json(calendars);
    } catch (error) {
      console.error("Fetch calendars error:", error);
      res.status(500).json({ error: "Failed to fetch calendars" });
    }
  });

  // GET /api/calendar/preferences - Get calendar preferences for user
  app.get("/api/calendar/preferences", async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const preferences = await storage.getCalendarPreferences(userId);
      res.json(preferences);
    } catch (error) {
      console.error("Get calendar preferences error:", error);
      res.status(500).json({ error: "Failed to fetch preferences" });
    }
  });

  // PUT /api/calendar/preferences - Upsert calendar preference
  app.put("/api/calendar/preferences", async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { accountId, calendarId, calendarName, calendarColor, isEnabled } =
        req.body;
      if (!accountId || !calendarId || !calendarName) {
        return res
          .status(400)
          .json({ error: "Account ID, calendar ID, and name are required" });
      }

      const preference = await storage.upsertCalendarPreference(userId, {
        accountId,
        calendarId,
        calendarName,
        calendarColor,
        isEnabled,
      });

      res.json(preference);
    } catch (error) {
      console.error("Upsert calendar preference error:", error);
      res.status(500).json({ error: "Failed to save preference" });
    }
  });

  // PATCH /api/calendar/preferences/:id/toggle - Toggle calendar visibility
  app.patch("/api/calendar/preferences/:id/toggle", async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { id } = req.params;
      const updated = await storage.toggleCalendarPreference(id, userId);
      if (!updated) {
        return res.status(404).json({ error: "Calendar preference not found" });
      }

      res.json(updated);
    } catch (error) {
      console.error("Toggle calendar preference error:", error);
      res.status(500).json({ error: "Failed to toggle calendar" });
    }
  });

  // ==========================================
  // Staff Directory Endpoints
  // ==========================================

  // GET /api/staff-directory - Get all staff organized by department
  app.get("/api/staff-directory", requireAuth, async (req, res) => {
    try {
      const { STAFF_DIRECTORY } = await import("@shared/staffDirectory");
      res.json(STAFF_DIRECTORY);
    } catch (error) {
      console.error("Get staff directory error:", error);
      res.status(500).json({ error: "Failed to get staff directory" });
    }
  });

  // GET /api/staff-directory/search - Search staff by name or email
  app.get("/api/staff-directory/search", requireAuth, async (req, res) => {
    try {
      const query = req.query.q as string;
      if (!query || query.trim().length < 2) {
        return res.json([]);
      }

      const { searchStaff } = await import("@shared/staffDirectory");
      const results = searchStaff(query);
      res.json(results);
    } catch (error) {
      console.error("Search staff error:", error);
      res.status(500).json({ error: "Failed to search staff" });
    }
  });

  // GET /api/staff-directory/teachers - Get all teachers for autocomplete
  app.get("/api/staff-directory/teachers", requireAuth, async (req, res) => {
    try {
      const { getTeachers } = await import("@shared/staffDirectory");
      const teachers = getTeachers();
      res.json(teachers);
    } catch (error) {
      console.error("Get teachers error:", error);
      res.status(500).json({ error: "Failed to get teachers" });
    }
  });

  app.post("/api/feedback", requireAuth, async (req, res) => {
    try {
      const result = submitFeedbackSchema.safeParse(req.body);
      if (!result.success) {
        const error = fromZodError(result.error);
        return res.status(400).json({ error: error.message });
      }

      const userId = (req.session as any).userId;
      const feedback = await storage.createAppFeedback(userId, {
        message: result.data.message,
      });

      // Notify the team by email, but don't fail the request if it can't send.
      const user = await storage.getUser(userId);
      sendFeedbackNotification({
        message: result.data.message,
        userName: user?.displayName || undefined,
        userEmail: user?.email || undefined,
      }).catch((err) => {
        console.error("Failed to send feedback notification email:", err);
      });

      res.json({ success: true, feedback });
    } catch (error) {
      console.error("Submit feedback error:", error);
      res.status(500).json({ error: "Failed to submit feedback" });
    }
  });

  app.post("/api/moderation/report", async (req, res) => {
    try {
      const result = reportCommentSchema.safeParse(req.body);
      if (!result.success) {
        const error = fromZodError(result.error);
        return res.status(400).json({ error: error.message });
      }

      const reporterId = (req.session as any).userId || null;
      const reporter = reporterId ? await storage.getUser(reporterId) : null;
      const data = result.data;
      const authorKey = commentAuthorKey(
        data.publicationId,
        data.commentAuthorId || 0,
        data.commentAuthorName,
      );

      const report = await storage.createCommentReport({
        reporterId,
        publicationId: data.publicationId,
        articleId: data.articleId,
        commentId: data.commentId,
        commentAuthorId: data.commentAuthorId || 0,
        commentAuthorName: data.commentAuthorName,
        commentAuthorKey: authorKey,
        commentExcerpt: data.commentExcerpt,
        reason: data.reason,
      });

      sendModerationAlert({
        kind: "report",
        reason: data.reason,
        commentAuthorName: data.commentAuthorName,
        commentExcerpt: data.commentExcerpt,
        publicationId: data.publicationId,
        articleId: data.articleId,
        commentId: data.commentId,
        reporterEmail: reporter?.email,
      }).catch((err) => {
        console.error("Failed to send comment report email:", err);
      });

      res.status(201).json({ success: true, reportId: report.id });
    } catch (error) {
      console.error("Report comment error:", error);
      res.status(500).json({ error: "Failed to submit report" });
    }
  });

  app.post("/api/moderation/block", async (req, res) => {
    try {
      const result = blockUserSchema.safeParse(req.body);
      if (!result.success) {
        const error = fromZodError(result.error);
        return res.status(400).json({ error: error.message });
      }

      const blockerId = (req.session as any).userId || null;
      const blocker = blockerId ? await storage.getUser(blockerId) : null;
      const data = result.data;
      const authorKey = commentAuthorKey(
        data.publicationId,
        data.commentAuthorId || 0,
        data.commentAuthorName,
      );

      let blockId: string | null = null;
      if (blockerId) {
        const block = await storage.createUserBlock({
          blockerId,
          publicationId: data.publicationId,
          blockedAuthorKey: authorKey,
          blockedAuthorName: data.commentAuthorName,
          sourceCommentId: data.sourceCommentId,
          sourceArticleId: data.sourceArticleId,
          sourceExcerpt: data.sourceExcerpt,
        });
        blockId = block.id;
      }

      sendModerationAlert({
        kind: "block",
        commentAuthorName: data.commentAuthorName,
        commentExcerpt: data.sourceExcerpt || "(no comment excerpt)",
        publicationId: data.publicationId,
        articleId: data.sourceArticleId,
        commentId: data.sourceCommentId,
        reporterEmail: blocker?.email,
      }).catch((err) => {
        console.error("Failed to send block notification email:", err);
      });

      res.status(201).json({ success: true, blockId });
    } catch (error) {
      console.error("Block user error:", error);
      res.status(500).json({ error: "Failed to block user" });
    }
  });

  app.get("/api/moderation/blocks", requireAuth, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const blocks = await storage.listUserBlocks(userId);
      res.json({ blocks });
    } catch (error) {
      console.error("List blocks error:", error);
      res.status(500).json({ error: "Failed to load blocked users" });
    }
  });

  app.delete("/api/moderation/blocks", requireAuth, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const publicationId =
        typeof req.body?.publicationId === "string"
          ? req.body.publicationId
          : "";
      const blockedAuthorKey =
        typeof req.body?.blockedAuthorKey === "string"
          ? req.body.blockedAuthorKey
          : "";
      if (!publicationId || !blockedAuthorKey) {
        return res.status(400).json({ error: "Missing block to remove" });
      }
      await storage.deleteUserBlock(userId, publicationId, blockedAuthorKey);
      res.json({ success: true });
    } catch (error) {
      console.error("Unblock user error:", error);
      res.status(500).json({ error: "Failed to unblock user" });
    }
  });

  // ==========================================
  // Beta program + admin dashboard
  // ==========================================

  // Throttle public signups to limit spam (10 per IP per hour)
  const betaLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 10,
    message: { error: "Too many signups. Please try again later." },
    standardHeaders: true,
    legacyHeaders: false,
  });

  const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
    if (!(req.session as any).isAdmin) {
      return res.status(401).json({ error: "Admin authentication required" });
    }
    next();
  };

  // Public: join the beta
  app.post("/api/beta/signup", betaLimiter, async (req, res) => {
    try {
      const result = betaSignupSchema.safeParse(req.body);
      if (!result.success) {
        const error = fromZodError(result.error);
        return res.status(400).json({ error: error.message });
      }

      const name = result.data.name.trim();
      const email = result.data.email.trim().toLowerCase();
      const role = result.data.role;

      const existing = await storage.getBetaSignupByEmail(email);
      if (existing) {
        return res.json({
          success: true,
          message: "You're already on the list — we'll be in touch!",
        });
      }

      const signup = await storage.createBetaSignup({ name, email, role });

      // Best-effort team notification; never fail the signup on email errors
      const notify = await sendBetaSignupNotification({
        name: signup.name,
        email: signup.email,
        role: signup.role,
      });
      if (!notify.success) {
        console.error("Beta team notification failed:", notify.error);
      }

      res.json({
        success: true,
        message: "You're on the list! We'll email you when your spot is ready.",
      });
    } catch (error) {
      console.error("Beta signup error:", error);
      res
        .status(500)
        .json({ error: "Something went wrong. Please try again." });
    }
  });

  // Admin auth
  app.post("/api/admin/login", authLimiter, (req, res) => {
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminPassword) {
      return res.status(500).json({ error: "Admin access is not configured." });
    }
    const password = (req.body ?? {}).password;
    if (typeof password !== "string" || password !== adminPassword) {
      return res.status(401).json({ error: "Incorrect password" });
    }
    (req.session as any).isAdmin = true;
    res.json({ success: true });
  });

  app.get("/api/admin/session", (req, res) => {
    res.json({ isAdmin: Boolean((req.session as any).isAdmin) });
  });

  app.post("/api/admin/logout", (req, res) => {
    (req.session as any).isAdmin = false;
    res.json({ success: true });
  });

  // Admin: list signups
  app.get("/api/admin/beta", requireAdmin, async (_req, res) => {
    try {
      const signups = await storage.listBetaSignups();
      res.json({ signups });
    } catch (error) {
      console.error("List beta signups error:", error);
      res.status(500).json({ error: "Failed to load signups" });
    }
  });

  app.get("/api/admin/feedback", requireAdmin, async (_req, res) => {
    try {
      const feedback = await storage.listAppFeedback();
      res.json({ feedback });
    } catch (error) {
      console.error("List app feedback error:", error);
      res.status(500).json({ error: "Failed to load feedback" });
    }
  });

  app.get("/api/admin/reports", requireAdmin, async (_req, res) => {
    try {
      const reports = await storage.listCommentReports();
      res.json({ reports });
    } catch (error) {
      console.error("List comment reports error:", error);
      res.status(500).json({ error: "Failed to load reports" });
    }
  });

  app.post(
    "/api/admin/reports/:id/remove",
    requireAdmin,
    async (req, res) => {
      try {
        const report = await storage.getCommentReport(req.params.id);
        if (!report) {
          return res.status(404).json({ error: "Report not found" });
        }

        const wpApiBaseUrl = getWpApiBaseUrl(report.publicationId);
        const wpUsername = process.env.WP_USERNAME;
        const wpPassword = process.env.WP_PASSWORD;
        if (wpUsername && wpPassword) {
          const auth = Buffer.from(`${wpUsername}:${wpPassword}`).toString(
            "base64",
          );
          const commentResponse = await wpFetch(
            `${wpApiBaseUrl}/comments/${report.commentId}?context=edit`,
            { headers: { Authorization: `Basic ${auth}` } },
          );
          if (commentResponse.ok) {
            const wpComment = (await commentResponse.json()) as {
              author_email?: string;
            };
            if (wpComment.author_email) {
              await storage.suspendUserByEmail(wpComment.author_email);
            }
          }
          await wpFetch(`${wpApiBaseUrl}/comments/${report.commentId}?force=true`, {
            method: "DELETE",
            headers: { Authorization: `Basic ${auth}` },
          });
        }

        const updated = await storage.resolveCommentReport(report.id);
        res.json({ success: true, report: updated });
      } catch (error) {
        console.error("Remove reported comment error:", error);
        res.status(500).json({ error: "Failed to remove comment" });
      }
    },
  );

  // Admin: approve a signup (sends the TestFlight email)
  app.post("/api/admin/beta/:id/approve", requireAdmin, async (req, res) => {
    try {
      const signup = await storage.getBetaSignup(req.params.id);
      if (!signup) {
        return res.status(404).json({ error: "Signup not found" });
      }

      const updated = await storage.updateBetaSignupStatus(
        signup.id,
        "approved",
      );

      const emailResult = await sendBetaApprovalEmail({
        to: signup.email,
        name: signup.name,
      });
      if (!emailResult.success) {
        return res.status(502).json({
          error: `Marked approved, but the email failed to send: ${emailResult.error}`,
          signup: updated,
        });
      }

      res.json({ success: true, signup: updated });
    } catch (error) {
      console.error("Approve beta signup error:", error);
      res.status(500).json({ error: "Failed to approve signup" });
    }
  });

  // Admin: reject a signup
  app.post("/api/admin/beta/:id/reject", requireAdmin, async (req, res) => {
    try {
      const signup = await storage.getBetaSignup(req.params.id);
      if (!signup) {
        return res.status(404).json({ error: "Signup not found" });
      }
      const updated = await storage.updateBetaSignupStatus(
        signup.id,
        "rejected",
      );
      res.json({ success: true, signup: updated });
    } catch (error) {
      console.error("Reject beta signup error:", error);
      res.status(500).json({ error: "Failed to reject signup" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
