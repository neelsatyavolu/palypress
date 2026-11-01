import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  varchar,
  boolean,
  timestamp,
  integer,
  primaryKey,
  unique,
  index,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table - Supports Google OAuth, Sign in with Apple, and email/password
export const users = pgTable("users", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  // Google OAuth fields (nullable for email/password and Apple users)
  googleId: text("google_id").unique(),
  appleId: text("apple_id").unique(),
  googleAccessToken: text("google_access_token"),
  googleRefreshToken: text("google_refresh_token"),
  tokenExpiresAt: timestamp("token_expires_at"),
  // Email/password fields (nullable for Google OAuth users)
  passwordHash: text("password_hash"),
  emailVerified: boolean("email_verified").default(false).notNull(),
  // Two-Factor Authentication fields
  twoFactorEnabled: boolean("two_factor_enabled").default(false).notNull(),
  twoFactorSecret: text("two_factor_secret"), // Encrypted TOTP secret
  twoFactorBackupCodes: text("two_factor_backup_codes").array(), // Hashed backup codes
  // Common fields
  email: text("email").notNull().unique(),
  displayName: text("display_name"),
  photoUrl: text("photo_url"),
  studentId: text("student_id"), // Extracted from email: 123456@pausd.us -> 123456
  weeklyDigestEnabled: boolean("weekly_digest_enabled").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastLoginAt: timestamp("last_login_at").defaultNow().notNull(),
  suspendedAt: timestamp("suspended_at"),
});

export const insertUserSchema = createInsertSchema(users).pick({
  googleId: true,
  appleId: true,
  email: true,
  displayName: true,
  photoUrl: true,
});

// Schema for Google Sign-In on client
export const googleSignInSchema = z.object({
  idToken: z.string().min(1, "ID token is required"),
  accessToken: z.string().optional(),
});

// Schema for Sign in with Apple on client
export const appleSignInSchema = z.object({
  identityToken: z.string().min(1, "Identity token is required"),
  fullName: z
    .object({
      givenName: z.string().nullable().optional(),
      familyName: z.string().nullable().optional(),
    })
    .optional(),
});

// Schema for email/password sign up
export const emailSignUpSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(10, "Password must be at least 10 characters")
    .max(100, "Password is too long")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(
      /[^A-Za-z0-9]/,
      "Password must contain at least one special character",
    ),
  displayName: z
    .string()
    .min(1, "Display name is required")
    .max(50, "Display name must be less than 50 characters"),
  agreedToTerms: z.literal(true, {
    errorMap: () => ({
      message: "You must agree to the Terms of Service and Privacy Policy",
    }),
  }),
});

// Schema for email/password sign in
export const emailSignInSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

// Schema for email verification
export const verifyEmailSchema = z.object({
  token: z.string().min(1, "Verification token is required"),
});

// Schema for resending verification email
export const resendVerificationSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export const requestPasswordResetSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export const updateProfileSchema = z.object({
  displayName: z
    .string()
    .min(1, "Display name is required")
    .max(50, "Display name must be less than 50 characters"),
});

// Schema for setting/changing password
export const setPasswordSchema = z.object({
  currentPassword: z.string().optional(), // Optional for Google users setting first password
  newPassword: z
    .string()
    .min(10, "Password must be at least 10 characters")
    .max(100, "Password is too long")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(
      /[^A-Za-z0-9]/,
      "Password must contain at least one special character",
    ),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Reset code is required"),
  newPassword: setPasswordSchema.shape.newPassword,
});

// Schema for 2FA setup
export const setupTwoFactorSchema = z.object({
  token: z.string().length(6, "Token must be 6 digits"),
});

// Schema for 2FA verification during sign-in
export const verifyTwoFactorSchema = z.object({
  token: z.string().min(6, "Token must be at least 6 characters"), // Can be 6-digit code or backup code
  isBackupCode: z.boolean().optional(),
});

// Schema for disabling 2FA
export const disableTwoFactorSchema = z.object({
  password: z.string().min(1, "Password is required"),
  token: z.string().length(6, "Token must be 6 digits"),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type SafeUser = Omit<
  User,
  "googleAccessToken" | "googleRefreshToken" | "passwordHash"
>;

// Email verification tokens table
export const emailVerificationTokens = pgTable(
  "email_verification_tokens",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    token: text("token").notNull().unique(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    tokenIdx: index("idx_verification_token").on(table.token),
    userIdIdx: index("idx_verification_user_id").on(table.userId),
  }),
);

export type EmailVerificationToken =
  typeof emailVerificationTokens.$inferSelect;

export const passwordResetTokens = pgTable(
  "password_reset_tokens",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    token: text("token").notNull().unique(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    tokenIdx: index("idx_password_reset_token").on(table.token),
    userIdIdx: index("idx_password_reset_user_id").on(table.userId),
  }),
);

export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;

// Manual class schedule entries
export const manualClasses = pgTable(
  "manual_classes",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    className: text("class_name").notNull(),
    teacherName: text("teacher_name"),
    roomNumber: text("room_number"),
    period: integer("period").notNull(), // 1-8
    dayPattern: text("day_pattern").array(), // ['M', 'T', 'W', 'Th', 'F']
    startTime: text("start_time"), // "08:30"
    endTime: text("end_time"), // "09:20"
    color: text("color"), // Custom color for UI
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    userPeriodIdx: index("idx_manual_class_user_period").on(
      table.userId,
      table.period,
    ),
  }),
);

export const insertManualClassSchema = z.object({
  className: z.string().min(1, "Class name is required"),
  teacherName: z.string().optional(),
  roomNumber: z.string().optional(),
  period: z.number().min(1).max(8),
  dayPattern: z.array(z.enum(["M", "T", "W", "Th", "F"])).optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  color: z.string().optional(),
  notes: z.string().optional(),
});

export const updateManualClassSchema = insertManualClassSchema.partial();

export type ManualClass = typeof manualClasses.$inferSelect;

// Bell schedules
export const bellSchedules = pgTable("bell_schedules", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text("name").notNull(), // 'Regular', 'Minimum Day', 'Rally', etc.
  scheduleType: text("schedule_type").notNull(), // 'regular', 'minimum', 'rally', 'finals'
  isDefault: boolean("is_default").default(false),
  periods: text("periods").notNull(), // JSON array of period times
  effectiveDate: timestamp("effective_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type BellSchedule = typeof bellSchedules.$inferSelect;

// Campus locations for the map
export const campusLocations = pgTable(
  "campus_locations",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    name: text("name").notNull(),
    roomNumber: text("room_number"),
    building: text("building"),
    floor: integer("floor").default(1),
    category: text("category"), // 'classroom', 'office', 'gym', 'restroom', 'parking', etc.
    svgPathId: text("svg_path_id"), // Reference to SVG element
    coordinates: text("coordinates"), // JSON {x, y} for map positioning
    description: text("description"),
    searchKeywords: text("search_keywords").array(),
    isAccessible: boolean("is_accessible").default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    roomNumberIdx: index("idx_location_room").on(table.roomNumber),
    buildingIdx: index("idx_location_building").on(table.building),
  }),
);

export type CampusLocation = typeof campusLocations.$inferSelect;

// Cached staff directory data (from Google Directory API)
export const cachedStaffDirectory = pgTable("cached_staff_directory", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  googleId: text("google_id").unique(),
  email: text("email").notNull().unique(), // @pausd.org
  displayName: text("display_name"),
  title: text("title"),
  department: text("department"),
  photoUrl: text("photo_url"),
  phoneNumber: text("phone_number"),
  roomNumber: text("room_number"),
  cachedAt: timestamp("cached_at").defaultNow().notNull(),
});

export type CachedStaff = typeof cachedStaffDirectory.$inferSelect;

export const savedArticles = pgTable(
  "saved_articles",
  {
    userId: varchar("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    articleId: integer("article_id").notNull(),
    articleTitle: text("article_title").notNull(),
    articleExcerpt: text("article_excerpt"),
    articleAuthor: text("article_author"),
    articleDate: text("article_date"),
    articleImageUrl: text("article_image_url"),
    savedAt: timestamp("saved_at").defaultNow().notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.articleId] }),
    savedAtIdx: index("idx_saved_at").on(table.savedAt.desc()),
  }),
);

export const saveArticleSchema = z.object({
  articleId: z.number(),
  articleTitle: z.string(),
  articleExcerpt: z.string().optional(),
  articleAuthor: z.string().optional(),
  articleDate: z.string().optional(),
  articleImageUrl: z.string().optional(),
});

export type SavedArticle = typeof savedArticles.$inferSelect;

export const publicationFollows = pgTable(
  "publication_follows",
  {
    userId: varchar("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    publicationId: varchar("publication_id", { length: 50 }).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.publicationId] }),
    userIdx: index("idx_follows_user").on(table.userId),
  }),
);

export const insertFollowSchema = z.object({
  publicationId: z.string().min(1).max(50),
});

export type PublicationFollow = typeof publicationFollows.$inferSelect;

export const postCommentSchema = z.object({
  postId: z.number(),
  content: z
    .string()
    .min(1, "Comment cannot be empty")
    .max(5000, "Comment is too long"),
  parentId: z.number().optional(),
  publicationId: z.string().optional(), // Publication to post comment to
});

export const editCommentSchema = z.object({
  content: z
    .string()
    .min(1, "Comment cannot be empty")
    .max(5000, "Comment is too long"),
  publicationId: z.string().optional(), // Publication for the comment
});

export const reportCommentSchema = z.object({
  publicationId: z.string().min(1).max(50),
  articleId: z.number().int(),
  commentId: z.number().int(),
  commentAuthorId: z.number().int().optional(),
  commentAuthorName: z.string().min(1).max(200),
  commentExcerpt: z.string().min(1).max(2000),
  reason: z.string().min(1).max(200),
});

export const blockUserSchema = z.object({
  publicationId: z.string().min(1).max(50),
  commentAuthorId: z.number().int().optional(),
  commentAuthorName: z.string().min(1).max(200),
  sourceCommentId: z.number().int().optional(),
  sourceArticleId: z.number().int().optional(),
  sourceExcerpt: z.string().max(2000).optional(),
});

export const commentReports = pgTable(
  "comment_reports",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    reporterId: varchar("reporter_id").references(() => users.id, {
      onDelete: "set null",
    }),
    publicationId: varchar("publication_id", { length: 50 }).notNull(),
    articleId: integer("article_id").notNull(),
    commentId: integer("comment_id").notNull(),
    commentAuthorId: integer("comment_author_id").default(0).notNull(),
    commentAuthorName: text("comment_author_name").notNull(),
    commentAuthorKey: text("comment_author_key").notNull(),
    commentExcerpt: text("comment_excerpt").notNull(),
    reason: text("reason").notNull(),
    status: text("status").default("open").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    resolvedAt: timestamp("resolved_at"),
  },
  (table) => ({
    statusIdx: index("idx_comment_reports_status").on(
      table.status,
      table.createdAt.desc(),
    ),
  }),
);

export type CommentReport = typeof commentReports.$inferSelect;
export type CommentReportWithUser = CommentReport & {
  reporterEmail: string | null;
  reporterDisplayName: string | null;
};

export const userBlocks = pgTable(
  "user_blocks",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    blockerId: varchar("blocker_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    publicationId: varchar("publication_id", { length: 50 }).notNull(),
    blockedAuthorKey: text("blocked_author_key").notNull(),
    blockedAuthorName: text("blocked_author_name").notNull(),
    sourceCommentId: integer("source_comment_id"),
    sourceArticleId: integer("source_article_id"),
    sourceExcerpt: text("source_excerpt"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    uniqueBlock: unique("user_blocks_unique").on(
      table.blockerId,
      table.publicationId,
      table.blockedAuthorKey,
    ),
    blockerIdx: index("idx_user_blocks_blocker").on(table.blockerId),
  }),
);

export type UserBlock = typeof userBlocks.$inferSelect;

// Article upvotes table
export const articleUpvotes = pgTable(
  "article_upvotes",
  {
    userId: varchar("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    articleId: integer("article_id").notNull(),
    publicationId: varchar("publication_id", { length: 50 }).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    pk: primaryKey({
      columns: [table.userId, table.articleId, table.publicationId],
    }),
    upvotesLookupIdx: index("idx_upvotes_lookup").on(
      table.publicationId,
      table.articleId,
    ),
    createdAtIdx: index("idx_upvotes_created_at").on(table.createdAt.desc()),
  }),
);

export const upvoteArticleSchema = z.object({
  articleId: z.number(),
  publicationId: z.string(),
});

export const getUpvoteCountsSchema = z.object({
  articles: z.array(
    z.object({
      articleId: z.number(),
      publicationId: z.string(),
    }),
  ),
});

export type ArticleUpvote = typeof articleUpvotes.$inferSelect;

// In-app notification preferences
export const notificationPreferences = pgTable(
  "notification_preferences",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    publicationId: text("publication_id").notNull(),
    enabled: boolean("enabled").default(true).notNull(),
    categoryIds: integer("category_ids").array(), // null = all categories
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    uniqueUserPublication: unique().on(table.userId, table.publicationId),
    userEnabledIdx: index("idx_notification_prefs_user_enabled").on(
      table.userId,
      table.enabled,
    ),
  }),
);

export const updateNotificationPreferenceSchema = z.object({
  publicationId: z.string().min(1, "Publication ID is required"),
  enabled: z.boolean(),
  categoryIds: z.array(z.number()).nullable().optional(),
});

export type NotificationPreference =
  typeof notificationPreferences.$inferSelect;
export type InsertNotificationPreference =
  typeof notificationPreferences.$inferInsert;

export const pushNotificationDevices = pgTable(
  "push_notification_devices",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expoPushToken: text("expo_push_token").notNull().unique(),
    platform: text("platform"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    lastRegisteredAt: timestamp("last_registered_at").defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index("idx_push_devices_user").on(table.userId),
    tokenIdx: index("idx_push_devices_token").on(table.expoPushToken),
  }),
);

export const notificationFeedState = pgTable("notification_feed_state", {
  publicationId: text("publication_id").primaryKey(),
  latestArticleId: integer("latest_article_id").notNull(),
  latestArticlePublishedAt: timestamp("latest_article_published_at").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const updateWeeklyDigestPreferenceSchema = z.object({
  enabled: z.boolean(),
});

export const registerPushTokenSchema = z.object({
  token: z
    .string()
    .min(1, "Push token is required")
    .refine(
      (token) =>
        token.startsWith("ExponentPushToken[") ||
        token.startsWith("ExpoPushToken["),
      "Invalid Expo push token",
    ),
  platform: z.enum(["ios", "android"]).optional(),
});

export type PushNotificationDevice =
  typeof pushNotificationDevices.$inferSelect;
export type InsertPushNotificationDevice =
  typeof pushNotificationDevices.$inferInsert;
export type NotificationFeedState = typeof notificationFeedState.$inferSelect;

// Singleton row tracking when the weekly digest email last went out,
// so the in-process scheduler survives restarts without double-sending.
export const weeklyDigestState = pgTable("weekly_digest_state", {
  id: text("id").primaryKey().default("singleton"),
  lastSentAt: timestamp("last_sent_at"),
});

export type WeeklyDigestState = typeof weeklyDigestState.$inferSelect;

// ==================== TO-DO LIST ====================

export const todos = pgTable(
  "todos",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    dueDate: timestamp("due_date"),
    completed: boolean("completed").default(false).notNull(),
    completedAt: timestamp("completed_at"),
    priority: text("priority").default("medium"), // 'low', 'medium', 'high'
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index("idx_todo_user").on(table.userId),
    dueDateIdx: index("idx_todo_due_date").on(table.dueDate),
    userCompletedIdx: index("idx_todo_user_completed").on(
      table.userId,
      table.completed,
    ),
  }),
);

export const insertTodoSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title is too long"),
  description: z.string().max(1000).optional(),
  dueDate: z.string().optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
});

export const updateTodoSchema = insertTodoSchema.partial().extend({
  completed: z.boolean().optional(),
});

export type Todo = typeof todos.$inferSelect;

// Calendar Accounts table - Multiple Google Calendar accounts per user
export const calendarAccounts = pgTable(
  "calendar_accounts",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    accountEmail: text("account_email").notNull(),
    accountName: text("account_name"),
    accessToken: text("access_token").notNull(), // Google access token for this calendar account
    refreshToken: text("refresh_token"), // Google refresh token
    isEnabled: boolean("is_enabled").default(true).notNull(),
    isPrimary: boolean("is_primary").default(false).notNull(), // True for main sign-in account
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index("idx_calendar_account_user").on(table.userId),
    userEmailIdx: index("idx_calendar_account_user_email").on(
      table.userId,
      table.accountEmail,
    ),
  }),
);

export const insertCalendarAccountSchema = z.object({
  accountEmail: z.string().email(),
  accountName: z.string().optional(),
  accessToken: z.string().min(1),
  refreshToken: z.string().optional(),
});

export type CalendarAccount = typeof calendarAccounts.$inferSelect;

// Calendar Preferences table - Which calendars to show/hide
export const calendarPreferences = pgTable(
  "calendar_preferences",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    accountId: varchar("account_id")
      .notNull()
      .references(() => calendarAccounts.id, { onDelete: "cascade" }),
    calendarId: text("calendar_id").notNull(), // Google Calendar ID (e.g., "primary" or actual calendar ID)
    calendarName: text("calendar_name").notNull(),
    calendarColor: text("calendar_color"), // Hex color from Google
    isEnabled: boolean("is_enabled").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index("idx_calendar_pref_user").on(table.userId),
    accountIdx: index("idx_calendar_pref_account").on(table.accountId),
    uniqueUserCalendar: unique("unique_user_calendar").on(
      table.userId,
      table.accountId,
      table.calendarId,
    ),
  }),
);

export const insertCalendarPreferenceSchema = z.object({
  accountId: z.string(),
  calendarId: z.string(),
  calendarName: z.string(),
  calendarColor: z.string().optional(),
  isEnabled: z.boolean().optional(),
});

export type CalendarPreference = typeof calendarPreferences.$inferSelect;

// In-app feedback sent from Settings for the dev/admin dashboard
export const appFeedback = pgTable(
  "app_feedback",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    message: text("message").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index("idx_app_feedback_user").on(table.userId),
    createdAtIdx: index("idx_app_feedback_created_at").on(
      table.createdAt.desc(),
    ),
  }),
);

export const submitFeedbackSchema = z.object({
  message: z
    .string()
    .trim()
    .min(1, "Feedback cannot be empty")
    .max(2000, "Feedback is too long"),
});

export type AppFeedback = typeof appFeedback.$inferSelect;
export type AppFeedbackWithUser = AppFeedback & {
  userEmail: string | null;
  userDisplayName: string | null;
};

// Beta program signups (public landing page)
export const betaSignups = pgTable(
  "beta_signups",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    role: text("role").notNull(),
    status: text("status").notNull().default("pending"), // pending | approved | rejected
    createdAt: timestamp("created_at").defaultNow().notNull(),
    reviewedAt: timestamp("reviewed_at"),
  },
  (table) => ({
    statusIdx: index("idx_beta_signups_status").on(table.status),
  }),
);

export const betaSignupSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name is too long"),
  email: z.string().email("Please enter a valid email address"),
  role: z.enum(["student", "staff", "parent", "alumni"], {
    errorMap: () => ({ message: "Please select a role" }),
  }),
});

export type BetaSignup = typeof betaSignups.$inferSelect;
export type BetaSignupInput = z.infer<typeof betaSignupSchema>;
