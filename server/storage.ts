import {
  users,
  savedArticles,
  articleUpvotes,
  notificationPreferences,
  pushNotificationDevices,
  notificationFeedState,
  weeklyDigestState,
  manualClasses,
  emailVerificationTokens,
  passwordResetTokens,
  todos,
  calendarAccounts,
  calendarPreferences,
  appFeedback,
  betaSignups,
  publicationFollows,
  commentReports,
  userBlocks,
  type User,
  type SafeUser,
  type SavedArticle,
  type ArticleUpvote,
  type NotificationPreference,
  type PushNotificationDevice,
  type NotificationFeedState,
  type WeeklyDigestState,
  type ManualClass,
  type EmailVerificationToken,
  type PasswordResetToken,
  type Todo,
  type CalendarAccount,
  type CalendarPreference,
  type AppFeedback,
  type AppFeedbackWithUser,
  type BetaSignup,
  type CommentReport,
  type CommentReportWithUser,
  type UserBlock,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, sql, lt, asc, desc } from "drizzle-orm";
import bcrypt from "bcryptjs";
import {
  encrypt,
  decrypt,
  encryptNullable,
  decryptNullable,
} from "./encryption";

export interface IStorage {
  // User methods (Google OAuth)
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByGoogleId(googleId: string): Promise<User | undefined>;
  getUserByAppleId(appleId: string): Promise<User | undefined>;
  createAppleUser(user: {
    appleId: string;
    email: string;
    displayName?: string | null;
    studentId?: string | null;
  }): Promise<User>;
  updateAppleUser(
    id: string,
    displayName?: string | null,
  ): Promise<User | undefined>;
  linkAppleId(
    id: string,
    appleId: string,
    displayName?: string | null,
  ): Promise<User | undefined>;
  createGoogleUser(user: {
    googleId: string;
    email: string;
    displayName?: string | null;
    photoUrl?: string | null;
    studentId?: string | null;
    googleAccessToken?: string | null;
  }): Promise<User>;
  updateUserGoogleTokens(
    id: string,
    accessToken: string | null,
    refreshToken: string | null,
    displayName?: string | null,
    photoUrl?: string | null,
  ): Promise<User | undefined>;
  getSafeUser(id: string): Promise<SafeUser | undefined>;
  updateDisplayName(
    id: string,
    displayName: string,
  ): Promise<SafeUser | undefined>;
  deleteUser(id: string): Promise<boolean>;

  // Email/password authentication methods
  createEmailUser(user: {
    email: string;
    passwordHash: string;
    displayName: string;
    studentId?: string | null;
  }): Promise<User>;
  verifyPassword(email: string, password: string): Promise<User | null>;
  updateLastLogin(userId: string): Promise<void>;
  markEmailAsVerified(userId: string): Promise<void>;

  // Email verification token methods
  createVerificationToken(
    userId: string,
    token: string,
    expiresAt: Date,
  ): Promise<EmailVerificationToken>;
  getVerificationToken(
    token: string,
  ): Promise<EmailVerificationToken | undefined>;
  deleteVerificationToken(token: string): Promise<void>;
  deleteUserVerificationTokens(userId: string): Promise<void>;

  // Password reset token methods
  createPasswordResetToken(
    userId: string,
    token: string,
    expiresAt: Date,
  ): Promise<PasswordResetToken>;
  getPasswordResetToken(token: string): Promise<PasswordResetToken | undefined>;
  deletePasswordResetToken(token: string): Promise<void>;
  deleteUserPasswordResetTokens(userId: string): Promise<void>;

  // Password management methods
  setPasswordFromReset(userId: string, passwordHash: string): Promise<void>;
  setPassword(userId: string, passwordHash: string): Promise<void>;
  updatePassword(
    userId: string,
    currentPassword: string,
    newPasswordHash: string,
  ): Promise<boolean>;

  // Two-Factor Authentication methods
  setupTwoFactor(
    userId: string,
    secret: string,
    backupCodes: string[],
  ): Promise<void>;
  enableTwoFactor(userId: string): Promise<void>;
  disableTwoFactor(userId: string): Promise<void>;
  getTwoFactorSecret(userId: string): Promise<string | null>;
  verifyBackupCode(userId: string, code: string): Promise<boolean>;
  removeUsedBackupCode(userId: string, code: string): Promise<void>;

  // Todo methods
  getTodos(userId: string): Promise<Todo[]>;
  getUpcomingTodos(userId: string): Promise<Todo[]>;
  createTodo(
    userId: string,
    data: {
      title: string;
      description?: string;
      dueDate?: Date;
      priority?: string;
    },
  ): Promise<Todo>;
  updateTodo(
    id: string,
    userId: string,
    data: Partial<{
      title: string;
      description: string;
      dueDate: Date | null;
      completed: boolean;
      priority: string;
    }>,
  ): Promise<Todo | undefined>;
  deleteTodo(id: string, userId: string): Promise<boolean>;
  toggleTodo(id: string, userId: string): Promise<Todo | undefined>;

  // Google token methods
  getUserGoogleToken(userId: string): Promise<string | null>;
  updateUserGoogleAccessToken(
    userId: string,
    accessToken: string,
  ): Promise<void>;

  // Calendar account methods
  getCalendarAccounts(userId: string): Promise<CalendarAccount[]>;
  getCalendarAccount(
    id: string,
    userId: string,
  ): Promise<CalendarAccount | undefined>;
  createCalendarAccount(
    userId: string,
    data: {
      accountEmail: string;
      accountName?: string;
      accessToken: string;
      refreshToken?: string;
      isPrimary?: boolean;
    },
  ): Promise<CalendarAccount>;
  updateCalendarAccountToken(
    id: string,
    userId: string,
    accessToken: string,
    refreshToken?: string,
  ): Promise<void>;
  toggleCalendarAccount(
    id: string,
    userId: string,
  ): Promise<CalendarAccount | undefined>;
  deleteCalendarAccount(id: string, userId: string): Promise<boolean>;

  // Calendar preference methods
  getCalendarPreferences(userId: string): Promise<CalendarPreference[]>;
  getCalendarPreferencesByAccount(
    accountId: string,
    userId: string,
  ): Promise<CalendarPreference[]>;
  upsertCalendarPreference(
    userId: string,
    data: {
      accountId: string;
      calendarId: string;
      calendarName: string;
      calendarColor?: string;
      isEnabled?: boolean;
    },
  ): Promise<CalendarPreference>;
  toggleCalendarPreference(
    id: string,
    userId: string,
  ): Promise<CalendarPreference | undefined>;
  deleteCalendarPreferencesByAccount(
    accountId: string,
    userId: string,
  ): Promise<void>;

  // Push notification methods
  getNotificationPreferences(userId: string): Promise<NotificationPreference[]>;
  upsertNotificationPreference(
    userId: string,
    data: {
      publicationId: string;
      enabled: boolean;
      categoryIds?: number[] | null;
    },
  ): Promise<NotificationPreference>;
  upsertPushNotificationDevice(
    userId: string,
    data: { token: string; platform?: "ios" | "android" },
  ): Promise<PushNotificationDevice>;
  deletePushNotificationDeviceByToken(token: string): Promise<void>;
  getPushTargetsForArticle(
    publicationId: string,
    categoryIds: number[],
  ): Promise<
    {
      expoPushToken: string;
      publicationId: string;
      enabled: boolean;
      categoryIds: number[] | null;
    }[]
  >;
  getNotificationFeedState(
    publicationId: string,
  ): Promise<NotificationFeedState | undefined>;
  upsertNotificationFeedState(
    publicationId: string,
    latestArticleId: number,
    latestArticlePublishedAt: Date,
  ): Promise<void>;

  // Weekly digest email methods
  getTopUpvotedArticles(
    since: Date,
    limit: number,
  ): Promise<{ articleId: number; publicationId: string; count: number }[]>;
  updateWeeklyDigestPreference(userId: string, enabled: boolean): Promise<void>;
  getUsersForWeeklyDigest(): Promise<{ id: string; email: string }[]>;
  getWeeklyDigestState(): Promise<WeeklyDigestState | undefined>;
  setWeeklyDigestLastSentAt(lastSentAt: Date): Promise<void>;

  // App feedback methods
  createAppFeedback(
    userId: string,
    data: { message: string },
  ): Promise<AppFeedback>;
  listAppFeedback(): Promise<AppFeedbackWithUser[]>;

  // Follows methods
  getFollows(userId: string): Promise<string[]>;
  addFollow(userId: string, publicationId: string): Promise<void>;
  removeFollow(userId: string, publicationId: string): Promise<void>;

  createCommentReport(data: {
    reporterId?: string | null;
    publicationId: string;
    articleId: number;
    commentId: number;
    commentAuthorId: number;
    commentAuthorName: string;
    commentAuthorKey: string;
    commentExcerpt: string;
    reason: string;
  }): Promise<CommentReport>;
  listCommentReports(): Promise<CommentReportWithUser[]>;
  getCommentReport(id: string): Promise<CommentReport | undefined>;
  resolveCommentReport(id: string): Promise<CommentReport | undefined>;
  createUserBlock(data: {
    blockerId: string;
    publicationId: string;
    blockedAuthorKey: string;
    blockedAuthorName: string;
    sourceCommentId?: number | null;
    sourceArticleId?: number | null;
    sourceExcerpt?: string | null;
  }): Promise<UserBlock>;
  listUserBlocks(blockerId: string): Promise<UserBlock[]>;
  deleteUserBlock(
    blockerId: string,
    publicationId: string,
    blockedAuthorKey: string,
  ): Promise<boolean>;
  suspendUser(id: string): Promise<void>;
  suspendUserByEmail(email: string): Promise<User | undefined>;
}

function decryptCalendarAccount(account: CalendarAccount): CalendarAccount {
  return {
    ...account,
    accessToken: decrypt(account.accessToken),
    refreshToken: decryptNullable(account.refreshToken),
  };
}

export class DatabaseStorage implements IStorage {
  // ==========================================
  // User Methods (Google OAuth)
  // ==========================================

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async getUserByGoogleId(googleId: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.googleId, googleId));
    return user || undefined;
  }

  async getUserByAppleId(appleId: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.appleId, appleId));
    return user || undefined;
  }

  async createAppleUser(insertUser: {
    appleId: string;
    email: string;
    displayName?: string | null;
    studentId?: string | null;
  }): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({
        appleId: insertUser.appleId,
        email: insertUser.email,
        displayName: insertUser.displayName || null,
        studentId: insertUser.studentId || null,
        emailVerified: true,
      })
      .returning();
    return user;
  }

  async updateAppleUser(
    id: string,
    displayName?: string | null,
  ): Promise<User | undefined> {
    const updateData: Partial<User> = {
      lastLoginAt: new Date(),
      emailVerified: true,
    };
    if (displayName) {
      updateData.displayName = displayName;
    }
    const [user] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  async linkAppleId(
    id: string,
    appleId: string,
    displayName?: string | null,
  ): Promise<User | undefined> {
    const updateData: Partial<User> = {
      appleId,
      lastLoginAt: new Date(),
      emailVerified: true,
    };
    if (displayName) {
      updateData.displayName = displayName;
    }
    const [user] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  async createGoogleUser(insertUser: {
    googleId: string;
    email: string;
    displayName?: string | null;
    photoUrl?: string | null;
    studentId?: string | null;
    googleAccessToken?: string | null;
  }): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({
        googleId: insertUser.googleId,
        email: insertUser.email,
        displayName: insertUser.displayName || null,
        photoUrl: insertUser.photoUrl || null,
        studentId: insertUser.studentId || null,
        googleAccessToken: encryptNullable(insertUser.googleAccessToken),
        emailVerified: true,
      })
      .returning();
    return user;
  }

  async updateUserGoogleTokens(
    id: string,
    accessToken: string | null,
    refreshToken: string | null,
    displayName?: string | null,
    photoUrl?: string | null,
  ): Promise<User | undefined> {
    const updateData: Partial<User> = {
      lastLoginAt: new Date(),
      emailVerified: true,
    };

    if (accessToken !== undefined) {
      updateData.googleAccessToken = encryptNullable(accessToken);
    }
    if (refreshToken !== undefined) {
      updateData.googleRefreshToken = encryptNullable(refreshToken);
    }
    if (displayName !== undefined) {
      updateData.displayName = displayName;
    }
    if (photoUrl !== undefined) {
      updateData.photoUrl = photoUrl;
    }

    const [user] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  async getSafeUser(id: string): Promise<SafeUser | undefined> {
    const [user] = await db
      .select({
        id: users.id,
        googleId: users.googleId,
        appleId: users.appleId,
        email: users.email,
        displayName: users.displayName,
        photoUrl: users.photoUrl,
        studentId: users.studentId,
        emailVerified: users.emailVerified,
        weeklyDigestEnabled: users.weeklyDigestEnabled,
        tokenExpiresAt: users.tokenExpiresAt,
        createdAt: users.createdAt,
        lastLoginAt: users.lastLoginAt,
        suspendedAt: users.suspendedAt,
        twoFactorEnabled: users.twoFactorEnabled,
        twoFactorSecret: users.twoFactorSecret,
        twoFactorBackupCodes: users.twoFactorBackupCodes,
      })
      .from(users)
      .where(eq(users.id, id));
    return user || undefined;
  }

  async updateDisplayName(
    id: string,
    displayName: string,
  ): Promise<SafeUser | undefined> {
    const [user] = await db
      .update(users)
      .set({ displayName })
      .where(eq(users.id, id))
      .returning({
        id: users.id,
        googleId: users.googleId,
        appleId: users.appleId,
        email: users.email,
        displayName: users.displayName,
        photoUrl: users.photoUrl,
        studentId: users.studentId,
        emailVerified: users.emailVerified,
        weeklyDigestEnabled: users.weeklyDigestEnabled,
        tokenExpiresAt: users.tokenExpiresAt,
        createdAt: users.createdAt,
        lastLoginAt: users.lastLoginAt,
        suspendedAt: users.suspendedAt,
        twoFactorEnabled: users.twoFactorEnabled,
        twoFactorSecret: users.twoFactorSecret,
        twoFactorBackupCodes: users.twoFactorBackupCodes,
      });
    return user || undefined;
  }

  async deleteUser(id: string): Promise<boolean> {
    const deleted = await db
      .delete(users)
      .where(eq(users.id, id))
      .returning({ id: users.id });
    return deleted.length > 0;
  }

  // ==========================================
  // Email/Password Authentication Methods
  // ==========================================

  async createEmailUser(insertUser: {
    email: string;
    passwordHash: string;
    displayName: string;
    studentId?: string | null;
  }): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({
        email: insertUser.email,
        passwordHash: insertUser.passwordHash,
        displayName: insertUser.displayName,
        studentId: insertUser.studentId || null,
        emailVerified: false,
      })
      .returning();
    return user;
  }

  async verifyPassword(email: string, password: string): Promise<User | null> {
    const user = await this.getUserByEmail(email);
    if (!user || !user.passwordHash) {
      return null;
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    return isValid ? user : null;
  }

  async updateLastLogin(userId: string): Promise<void> {
    await db
      .update(users)
      .set({ lastLoginAt: new Date() })
      .where(eq(users.id, userId));
  }

  async markEmailAsVerified(userId: string): Promise<void> {
    await db
      .update(users)
      .set({ emailVerified: true })
      .where(eq(users.id, userId));
  }

  // ==========================================
  // Email Verification Token Methods
  // ==========================================

  async createVerificationToken(
    userId: string,
    token: string,
    expiresAt: Date,
  ): Promise<EmailVerificationToken> {
    const [verificationToken] = await db
      .insert(emailVerificationTokens)
      .values({
        userId,
        token,
        expiresAt,
      })
      .returning();
    return verificationToken;
  }

  async getVerificationToken(
    token: string,
  ): Promise<EmailVerificationToken | undefined> {
    const [verificationToken] = await db
      .select()
      .from(emailVerificationTokens)
      .where(eq(emailVerificationTokens.token, token));
    return verificationToken || undefined;
  }

  async deleteVerificationToken(token: string): Promise<void> {
    await db
      .delete(emailVerificationTokens)
      .where(eq(emailVerificationTokens.token, token));
  }

  async deleteUserVerificationTokens(userId: string): Promise<void> {
    await db
      .delete(emailVerificationTokens)
      .where(eq(emailVerificationTokens.userId, userId));
  }

  // Helper method to clean up expired tokens
  async cleanupExpiredTokens(): Promise<void> {
    await db
      .delete(emailVerificationTokens)
      .where(lt(emailVerificationTokens.expiresAt, new Date()));
    await db
      .delete(passwordResetTokens)
      .where(lt(passwordResetTokens.expiresAt, new Date()));
  }

  async createPasswordResetToken(
    userId: string,
    token: string,
    expiresAt: Date,
  ): Promise<PasswordResetToken> {
    const [resetToken] = await db
      .insert(passwordResetTokens)
      .values({
        userId,
        token,
        expiresAt,
      })
      .returning();
    return resetToken;
  }

  async getPasswordResetToken(
    token: string,
  ): Promise<PasswordResetToken | undefined> {
    const [resetToken] = await db
      .select()
      .from(passwordResetTokens)
      .where(eq(passwordResetTokens.token, token));
    return resetToken || undefined;
  }

  async deletePasswordResetToken(token: string): Promise<void> {
    await db
      .delete(passwordResetTokens)
      .where(eq(passwordResetTokens.token, token));
  }

  async deleteUserPasswordResetTokens(userId: string): Promise<void> {
    await db
      .delete(passwordResetTokens)
      .where(eq(passwordResetTokens.userId, userId));
  }

  // ==========================================
  // Password Management Methods
  // ==========================================

  async setPasswordFromReset(
    userId: string,
    passwordHash: string,
  ): Promise<void> {
    await db
      .update(users)
      .set({
        passwordHash,
        emailVerified: true,
        googleId: null,
        googleAccessToken: null,
        googleRefreshToken: null,
        tokenExpiresAt: null,
      })
      .where(eq(users.id, userId));
  }

  async setPassword(userId: string, passwordHash: string): Promise<void> {
    await db.update(users).set({ passwordHash }).where(eq(users.id, userId));
  }

  async updatePassword(
    userId: string,
    currentPassword: string,
    newPasswordHash: string,
  ): Promise<boolean> {
    const user = await this.getUser(userId);
    if (!user || !user.passwordHash) {
      return false;
    }

    // Verify current password
    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValid) {
      return false;
    }

    // Update to new password
    await db
      .update(users)
      .set({ passwordHash: newPasswordHash })
      .where(eq(users.id, userId));

    return true;
  }

  // ==========================================
  // Two-Factor Authentication Methods
  // ==========================================

  async setupTwoFactor(
    userId: string,
    secret: string,
    backupCodes: string[],
  ): Promise<void> {
    await db
      .update(users)
      .set({
        twoFactorSecret: encrypt(secret),
        twoFactorBackupCodes: backupCodes,
        twoFactorEnabled: false, // Not enabled until user verifies
      })
      .where(eq(users.id, userId));
  }

  async enableTwoFactor(userId: string): Promise<void> {
    await db
      .update(users)
      .set({ twoFactorEnabled: true })
      .where(eq(users.id, userId));
  }

  async disableTwoFactor(userId: string): Promise<void> {
    await db
      .update(users)
      .set({
        twoFactorEnabled: false,
        twoFactorSecret: null,
        twoFactorBackupCodes: null,
      })
      .where(eq(users.id, userId));
  }

  async getTwoFactorSecret(userId: string): Promise<string | null> {
    const user = await this.getUser(userId);
    return decryptNullable(user?.twoFactorSecret);
  }

  async verifyBackupCode(userId: string, code: string): Promise<boolean> {
    const user = await this.getUser(userId);
    if (!user || !user.twoFactorBackupCodes) {
      return false;
    }

    // Check if any backup code matches (they're hashed)
    for (const hashedCode of user.twoFactorBackupCodes) {
      const isValid = await bcrypt.compare(code, hashedCode);
      if (isValid) {
        return true;
      }
    }

    return false;
  }

  async removeUsedBackupCode(userId: string, code: string): Promise<void> {
    const user = await this.getUser(userId);
    if (!user || !user.twoFactorBackupCodes) {
      return;
    }

    // Find and remove the used backup code
    const remainingCodes = [];
    for (const hashedCode of user.twoFactorBackupCodes) {
      const isMatch = await bcrypt.compare(code, hashedCode);
      if (!isMatch) {
        remainingCodes.push(hashedCode);
      }
    }

    await db
      .update(users)
      .set({ twoFactorBackupCodes: remainingCodes })
      .where(eq(users.id, userId));
  }

  // ==========================================
  // Saved Articles Methods
  // ==========================================

  async saveArticle(
    userId: string,
    article: {
      articleId: number;
      articleTitle: string;
      articleExcerpt?: string;
      articleAuthor?: string;
      articleDate?: string;
      articleImageUrl?: string;
    },
  ): Promise<SavedArticle> {
    const [saved] = await db
      .insert(savedArticles)
      .values({
        userId,
        ...article,
      })
      .onConflictDoNothing()
      .returning();
    return saved;
  }

  async unsaveArticle(userId: string, articleId: number): Promise<boolean> {
    await db
      .delete(savedArticles)
      .where(
        and(
          eq(savedArticles.userId, userId),
          eq(savedArticles.articleId, articleId),
        ),
      );
    return true;
  }

  async getSavedArticles(userId: string): Promise<SavedArticle[]> {
    return await db
      .select()
      .from(savedArticles)
      .where(eq(savedArticles.userId, userId))
      .orderBy(savedArticles.savedAt);
  }

  async isArticleSaved(userId: string, articleId: number): Promise<boolean> {
    const [saved] = await db
      .select()
      .from(savedArticles)
      .where(
        and(
          eq(savedArticles.userId, userId),
          eq(savedArticles.articleId, articleId),
        ),
      );
    return !!saved;
  }

  async getSavedArticleIds(userId: string): Promise<number[]> {
    const articles = await db
      .select({ articleId: savedArticles.articleId })
      .from(savedArticles)
      .where(eq(savedArticles.userId, userId));
    return articles.map((a) => a.articleId);
  }

  // ==========================================
  // Follows Methods
  // ==========================================

  async getFollows(userId: string): Promise<string[]> {
    const rows = await db
      .select({ publicationId: publicationFollows.publicationId })
      .from(publicationFollows)
      .where(eq(publicationFollows.userId, userId));
    return rows.map((r) => r.publicationId);
  }

  async addFollow(userId: string, publicationId: string): Promise<void> {
    await db
      .insert(publicationFollows)
      .values({ userId, publicationId })
      .onConflictDoNothing();
  }

  async removeFollow(userId: string, publicationId: string): Promise<void> {
    await db
      .delete(publicationFollows)
      .where(
        and(
          eq(publicationFollows.userId, userId),
          eq(publicationFollows.publicationId, publicationId),
        ),
      );
  }

  // ==========================================
  // Upvote Methods
  // ==========================================

  async upvoteArticle(
    userId: string,
    articleId: number,
    publicationId: string,
  ): Promise<ArticleUpvote | null> {
    const [upvote] = await db
      .insert(articleUpvotes)
      .values({ userId, articleId, publicationId })
      .onConflictDoNothing()
      .returning();
    return upvote || null;
  }

  async removeUpvote(
    userId: string,
    articleId: number,
    publicationId: string,
  ): Promise<boolean> {
    await db
      .delete(articleUpvotes)
      .where(
        and(
          eq(articleUpvotes.userId, userId),
          eq(articleUpvotes.articleId, articleId),
          eq(articleUpvotes.publicationId, publicationId),
        ),
      );
    return true;
  }

  async getUserUpvotedArticles(
    userId: string,
  ): Promise<{ articleId: number; publicationId: string }[]> {
    const upvotes = await db
      .select({
        articleId: articleUpvotes.articleId,
        publicationId: articleUpvotes.publicationId,
      })
      .from(articleUpvotes)
      .where(eq(articleUpvotes.userId, userId));
    return upvotes;
  }

  async getUpvoteCounts(
    articles: { articleId: number; publicationId: string }[],
  ): Promise<Map<string, number>> {
    if (articles.length === 0) {
      return new Map();
    }

    const results = await db
      .select({
        articleId: articleUpvotes.articleId,
        publicationId: articleUpvotes.publicationId,
        count: sql<number>`count(*)::int`,
      })
      .from(articleUpvotes)
      .where(
        sql`(publication_id, article_id) IN (${sql.join(
          articles.map((a) => sql`(${a.publicationId}, ${a.articleId})`),
          sql`, `,
        )})`,
      )
      .groupBy(articleUpvotes.articleId, articleUpvotes.publicationId);

    const counts = new Map<string, number>();
    for (const row of results) {
      counts.set(`${row.publicationId}-${row.articleId}`, row.count);
    }
    return counts;
  }

  async isArticleUpvoted(
    userId: string,
    articleId: number,
    publicationId: string,
  ): Promise<boolean> {
    const [upvote] = await db
      .select()
      .from(articleUpvotes)
      .where(
        and(
          eq(articleUpvotes.userId, userId),
          eq(articleUpvotes.articleId, articleId),
          eq(articleUpvotes.publicationId, publicationId),
        ),
      );
    return !!upvote;
  }

  // ==========================================
  // Notification Preferences Methods
  // ==========================================

  async getNotificationPreferences(
    userId: string,
  ): Promise<NotificationPreference[]> {
    return db
      .select()
      .from(notificationPreferences)
      .where(eq(notificationPreferences.userId, userId));
  }

  async upsertNotificationPreference(
    userId: string,
    data: {
      publicationId: string;
      enabled: boolean;
      categoryIds?: number[] | null;
    },
  ): Promise<NotificationPreference> {
    const [pref] = await db
      .insert(notificationPreferences)
      .values({
        userId,
        publicationId: data.publicationId,
        enabled: data.enabled,
        categoryIds: data.categoryIds ?? null,
      })
      .onConflictDoUpdate({
        target: [
          notificationPreferences.userId,
          notificationPreferences.publicationId,
        ],
        set: {
          enabled: data.enabled,
          categoryIds: data.categoryIds ?? null,
          updatedAt: new Date(),
        },
      })
      .returning();
    return pref;
  }

  async upsertPushNotificationDevice(
    userId: string,
    data: { token: string; platform?: "ios" | "android" },
  ): Promise<PushNotificationDevice> {
    const now = new Date();
    const [device] = await db
      .insert(pushNotificationDevices)
      .values({
        userId,
        expoPushToken: data.token,
        platform: data.platform ?? null,
        lastRegisteredAt: now,
      })
      .onConflictDoUpdate({
        target: pushNotificationDevices.expoPushToken,
        set: {
          userId,
          platform: data.platform ?? null,
          updatedAt: now,
          lastRegisteredAt: now,
        },
      })
      .returning();
    return device;
  }

  async deletePushNotificationDeviceByToken(token: string): Promise<void> {
    await db
      .delete(pushNotificationDevices)
      .where(eq(pushNotificationDevices.expoPushToken, token));
  }

  async getPushTargetsForArticle(
    publicationId: string,
    categoryIds: number[],
  ): Promise<
    {
      expoPushToken: string;
      publicationId: string;
      enabled: boolean;
      categoryIds: number[] | null;
    }[]
  > {
    const rows = await db
      .select({
        expoPushToken: pushNotificationDevices.expoPushToken,
        publicationId: notificationPreferences.publicationId,
        enabled: notificationPreferences.enabled,
        categoryIds: notificationPreferences.categoryIds,
      })
      .from(pushNotificationDevices)
      .innerJoin(
        notificationPreferences,
        and(
          eq(pushNotificationDevices.userId, notificationPreferences.userId),
          eq(notificationPreferences.publicationId, publicationId),
          eq(notificationPreferences.enabled, true),
        ),
      );

    const seenTokens = new Set<string>();
    return rows.filter((row) => {
      if (seenTokens.has(row.expoPushToken)) return false;

      const matchesCategory =
        !row.categoryIds ||
        row.categoryIds.length === 0 ||
        row.categoryIds.some((id) => categoryIds.includes(id));

      if (!matchesCategory) return false;

      seenTokens.add(row.expoPushToken);
      return true;
    });
  }

  async getNotificationFeedState(
    publicationId: string,
  ): Promise<NotificationFeedState | undefined> {
    const [state] = await db
      .select()
      .from(notificationFeedState)
      .where(eq(notificationFeedState.publicationId, publicationId));
    return state || undefined;
  }

  async upsertNotificationFeedState(
    publicationId: string,
    latestArticleId: number,
    latestArticlePublishedAt: Date,
  ): Promise<void> {
    await db
      .insert(notificationFeedState)
      .values({
        publicationId,
        latestArticleId,
        latestArticlePublishedAt,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: notificationFeedState.publicationId,
        set: {
          latestArticleId,
          latestArticlePublishedAt,
          updatedAt: new Date(),
        },
      });
  }

  // ==========================================
  // Weekly Digest Email Methods
  // ==========================================

  async getTopUpvotedArticles(
    since: Date,
    limit: number,
  ): Promise<{ articleId: number; publicationId: string; count: number }[]> {
    return await db
      .select({
        articleId: articleUpvotes.articleId,
        publicationId: articleUpvotes.publicationId,
        count: sql<number>`count(*)::int`,
      })
      .from(articleUpvotes)
      .where(sql`${articleUpvotes.createdAt} >= ${since}`)
      .groupBy(articleUpvotes.articleId, articleUpvotes.publicationId)
      .orderBy(desc(sql`count(*)`))
      .limit(limit);
  }

  async updateWeeklyDigestPreference(
    userId: string,
    enabled: boolean,
  ): Promise<void> {
    await db
      .update(users)
      .set({ weeklyDigestEnabled: enabled })
      .where(eq(users.id, userId));
  }

  async getUsersForWeeklyDigest(): Promise<{ id: string; email: string }[]> {
    return await db
      .select({ id: users.id, email: users.email })
      .from(users)
      .where(
        and(eq(users.weeklyDigestEnabled, true), eq(users.emailVerified, true)),
      );
  }

  async getWeeklyDigestState(): Promise<WeeklyDigestState | undefined> {
    const [state] = await db
      .select()
      .from(weeklyDigestState)
      .where(eq(weeklyDigestState.id, "singleton"));
    return state || undefined;
  }

  async setWeeklyDigestLastSentAt(lastSentAt: Date): Promise<void> {
    await db
      .insert(weeklyDigestState)
      .values({ id: "singleton", lastSentAt })
      .onConflictDoUpdate({
        target: weeklyDigestState.id,
        set: { lastSentAt },
      });
  }

  // ==========================================
  // Manual Classes Methods (Schedule)
  // ==========================================

  async getManualClasses(userId: string): Promise<ManualClass[]> {
    return db
      .select()
      .from(manualClasses)
      .where(eq(manualClasses.userId, userId))
      .orderBy(manualClasses.period);
  }

  async createManualClass(
    userId: string,
    classData: {
      className: string;
      teacherName?: string;
      roomNumber?: string;
      period: number;
      dayPattern?: string[];
      startTime?: string;
      endTime?: string;
      color?: string;
      notes?: string;
    },
  ): Promise<ManualClass> {
    const [created] = await db
      .insert(manualClasses)
      .values({
        userId,
        ...classData,
      })
      .returning();
    return created;
  }

  async updateManualClass(
    id: string,
    userId: string,
    classData: Partial<{
      className: string;
      teacherName: string;
      roomNumber: string;
      period: number;
      dayPattern: string[];
      startTime: string;
      endTime: string;
      color: string;
      notes: string;
    }>,
  ): Promise<ManualClass | undefined> {
    const [updated] = await db
      .update(manualClasses)
      .set({ ...classData, updatedAt: new Date() })
      .where(and(eq(manualClasses.id, id), eq(manualClasses.userId, userId)))
      .returning();
    return updated || undefined;
  }

  async deleteManualClass(id: string, userId: string): Promise<boolean> {
    await db
      .delete(manualClasses)
      .where(and(eq(manualClasses.id, id), eq(manualClasses.userId, userId)));
    return true;
  }

  async upsertManualClassByPeriod(
    userId: string,
    period: number,
    classData: {
      className: string;
      teacherName?: string;
      roomNumber?: string;
      dayPattern?: string[];
      startTime?: string;
      endTime?: string;
      color?: string;
      notes?: string;
    },
  ): Promise<ManualClass> {
    // Try to find existing class for this user and period
    const existing = await db
      .select()
      .from(manualClasses)
      .where(
        and(eq(manualClasses.userId, userId), eq(manualClasses.period, period)),
      )
      .limit(1);

    if (existing.length > 0) {
      // Update existing class
      const [updated] = await db
        .update(manualClasses)
        .set({
          ...classData,
          updatedAt: new Date(),
        })
        .where(eq(manualClasses.id, existing[0].id))
        .returning();
      return updated;
    } else {
      // Create new class
      const [created] = await db
        .insert(manualClasses)
        .values({
          userId,
          period,
          ...classData,
        })
        .returning();
      return created;
    }
  }

  // ==========================================
  // Todo Methods
  // ==========================================

  async getTodos(userId: string): Promise<Todo[]> {
    return db
      .select()
      .from(todos)
      .where(eq(todos.userId, userId))
      .orderBy(asc(todos.dueDate), desc(todos.createdAt));
  }

  async getUpcomingTodos(userId: string): Promise<Todo[]> {
    const now = new Date();
    const weekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    return db
      .select()
      .from(todos)
      .where(and(eq(todos.userId, userId), eq(todos.completed, false)))
      .orderBy(asc(todos.dueDate), desc(todos.createdAt))
      .limit(10);
  }

  async createTodo(
    userId: string,
    data: {
      title: string;
      description?: string;
      dueDate?: Date;
      priority?: string;
    },
  ): Promise<Todo> {
    const [todo] = await db
      .insert(todos)
      .values({
        userId,
        title: data.title,
        description: data.description || null,
        dueDate: data.dueDate || null,
        priority: data.priority || "medium",
      })
      .returning();
    return todo;
  }

  async updateTodo(
    id: string,
    userId: string,
    data: Partial<{
      title: string;
      description: string;
      dueDate: Date | null;
      completed: boolean;
      priority: string;
    }>,
  ): Promise<Todo | undefined> {
    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined)
      updateData.description = data.description;
    if (data.dueDate !== undefined) updateData.dueDate = data.dueDate;
    if (data.priority !== undefined) updateData.priority = data.priority;
    if (data.completed !== undefined) {
      updateData.completed = data.completed;
      updateData.completedAt = data.completed ? new Date() : null;
    }

    const [updated] = await db
      .update(todos)
      .set(updateData)
      .where(and(eq(todos.id, id), eq(todos.userId, userId)))
      .returning();
    return updated || undefined;
  }

  async deleteTodo(id: string, userId: string): Promise<boolean> {
    await db
      .delete(todos)
      .where(and(eq(todos.id, id), eq(todos.userId, userId)));
    return true;
  }

  async toggleTodo(id: string, userId: string): Promise<Todo | undefined> {
    const [existing] = await db
      .select()
      .from(todos)
      .where(and(eq(todos.id, id), eq(todos.userId, userId)));

    if (!existing) return undefined;

    const newCompleted = !existing.completed;
    const [updated] = await db
      .update(todos)
      .set({
        completed: newCompleted,
        completedAt: newCompleted ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(and(eq(todos.id, id), eq(todos.userId, userId)))
      .returning();
    return updated || undefined;
  }

  // ==========================================
  // Google Token Methods
  // ==========================================

  async getUserGoogleToken(userId: string): Promise<string | null> {
    const [user] = await db
      .select({ googleAccessToken: users.googleAccessToken })
      .from(users)
      .where(eq(users.id, userId));
    return decryptNullable(user?.googleAccessToken);
  }

  async updateUserGoogleAccessToken(
    userId: string,
    accessToken: string,
  ): Promise<void> {
    await db
      .update(users)
      .set({ googleAccessToken: encrypt(accessToken) })
      .where(eq(users.id, userId));
  }

  // ==========================================
  // Calendar Account Methods
  // ==========================================

  async getCalendarAccounts(userId: string): Promise<CalendarAccount[]> {
    const accounts = await db
      .select()
      .from(calendarAccounts)
      .where(eq(calendarAccounts.userId, userId))
      .orderBy(
        desc(calendarAccounts.isPrimary),
        asc(calendarAccounts.createdAt),
      );
    return accounts.map(decryptCalendarAccount);
  }

  async getCalendarAccount(
    id: string,
    userId: string,
  ): Promise<CalendarAccount | undefined> {
    const [account] = await db
      .select()
      .from(calendarAccounts)
      .where(
        and(eq(calendarAccounts.id, id), eq(calendarAccounts.userId, userId)),
      );
    return account ? decryptCalendarAccount(account) : undefined;
  }

  async createCalendarAccount(
    userId: string,
    data: {
      accountEmail: string;
      accountName?: string;
      accessToken: string;
      refreshToken?: string;
      isPrimary?: boolean;
    },
  ): Promise<CalendarAccount> {
    const [account] = await db
      .insert(calendarAccounts)
      .values({
        userId,
        accountEmail: data.accountEmail,
        accountName: data.accountName || null,
        accessToken: encrypt(data.accessToken),
        refreshToken: encryptNullable(data.refreshToken),
        isPrimary: data.isPrimary || false,
      })
      .returning();
    return decryptCalendarAccount(account);
  }

  async updateCalendarAccountToken(
    id: string,
    userId: string,
    accessToken: string,
    refreshToken?: string,
  ): Promise<void> {
    const updateData: Record<string, unknown> = {
      accessToken: encrypt(accessToken),
      updatedAt: new Date(),
    };
    if (refreshToken) {
      updateData.refreshToken = encrypt(refreshToken);
    }
    await db
      .update(calendarAccounts)
      .set(updateData)
      .where(
        and(eq(calendarAccounts.id, id), eq(calendarAccounts.userId, userId)),
      );
  }

  async toggleCalendarAccount(
    id: string,
    userId: string,
  ): Promise<CalendarAccount | undefined> {
    const [existing] = await db
      .select()
      .from(calendarAccounts)
      .where(
        and(eq(calendarAccounts.id, id), eq(calendarAccounts.userId, userId)),
      );

    if (!existing) return undefined;

    const [updated] = await db
      .update(calendarAccounts)
      .set({
        isEnabled: !existing.isEnabled,
        updatedAt: new Date(),
      })
      .where(
        and(eq(calendarAccounts.id, id), eq(calendarAccounts.userId, userId)),
      )
      .returning();
    return updated || undefined;
  }

  async deleteCalendarAccount(id: string, userId: string): Promise<boolean> {
    await db
      .delete(calendarAccounts)
      .where(
        and(eq(calendarAccounts.id, id), eq(calendarAccounts.userId, userId)),
      );
    return true;
  }

  // ==========================================
  // Calendar Preference Methods
  // ==========================================

  async getCalendarPreferences(userId: string): Promise<CalendarPreference[]> {
    return db
      .select()
      .from(calendarPreferences)
      .where(eq(calendarPreferences.userId, userId))
      .orderBy(asc(calendarPreferences.calendarName));
  }

  async getCalendarPreferencesByAccount(
    accountId: string,
    userId: string,
  ): Promise<CalendarPreference[]> {
    return db
      .select()
      .from(calendarPreferences)
      .where(
        and(
          eq(calendarPreferences.accountId, accountId),
          eq(calendarPreferences.userId, userId),
        ),
      )
      .orderBy(asc(calendarPreferences.calendarName));
  }

  async upsertCalendarPreference(
    userId: string,
    data: {
      accountId: string;
      calendarId: string;
      calendarName: string;
      calendarColor?: string;
      isEnabled?: boolean;
    },
  ): Promise<CalendarPreference> {
    // Check if preference already exists
    const [existing] = await db
      .select()
      .from(calendarPreferences)
      .where(
        and(
          eq(calendarPreferences.userId, userId),
          eq(calendarPreferences.accountId, data.accountId),
          eq(calendarPreferences.calendarId, data.calendarId),
        ),
      );

    if (existing) {
      // Update existing
      const [updated] = await db
        .update(calendarPreferences)
        .set({
          calendarName: data.calendarName,
          calendarColor: data.calendarColor || existing.calendarColor,
          isEnabled:
            data.isEnabled !== undefined ? data.isEnabled : existing.isEnabled,
          updatedAt: new Date(),
        })
        .where(eq(calendarPreferences.id, existing.id))
        .returning();
      return updated;
    } else {
      // Insert new
      const [created] = await db
        .insert(calendarPreferences)
        .values({
          userId,
          accountId: data.accountId,
          calendarId: data.calendarId,
          calendarName: data.calendarName,
          calendarColor: data.calendarColor || null,
          isEnabled: data.isEnabled !== undefined ? data.isEnabled : true,
        })
        .returning();
      return created;
    }
  }

  async toggleCalendarPreference(
    id: string,
    userId: string,
  ): Promise<CalendarPreference | undefined> {
    const [existing] = await db
      .select()
      .from(calendarPreferences)
      .where(
        and(
          eq(calendarPreferences.id, id),
          eq(calendarPreferences.userId, userId),
        ),
      );

    if (!existing) return undefined;

    const [updated] = await db
      .update(calendarPreferences)
      .set({
        isEnabled: !existing.isEnabled,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(calendarPreferences.id, id),
          eq(calendarPreferences.userId, userId),
        ),
      )
      .returning();
    return updated || undefined;
  }

  async deleteCalendarPreferencesByAccount(
    accountId: string,
    userId: string,
  ): Promise<void> {
    await db
      .delete(calendarPreferences)
      .where(
        and(
          eq(calendarPreferences.accountId, accountId),
          eq(calendarPreferences.userId, userId),
        ),
      );
  }

  // ==========================================
  // App Feedback Methods
  // ==========================================

  async createAppFeedback(
    userId: string,
    data: { message: string },
  ): Promise<AppFeedback> {
    const [feedback] = await db
      .insert(appFeedback)
      .values({
        userId,
        message: data.message,
      })
      .returning();
    return feedback;
  }

  async listAppFeedback(): Promise<AppFeedbackWithUser[]> {
    return db
      .select({
        id: appFeedback.id,
        userId: appFeedback.userId,
        message: appFeedback.message,
        createdAt: appFeedback.createdAt,
        userEmail: users.email,
        userDisplayName: users.displayName,
      })
      .from(appFeedback)
      .leftJoin(users, eq(appFeedback.userId, users.id))
      .orderBy(desc(appFeedback.createdAt));
  }

  // ==========================================
  // Beta Program Methods
  // ==========================================

  async createBetaSignup(input: {
    name: string;
    email: string;
    role: string;
  }): Promise<BetaSignup> {
    const [signup] = await db
      .insert(betaSignups)
      .values({
        name: input.name,
        email: input.email,
        role: input.role,
      })
      .returning();
    return signup;
  }

  async getBetaSignupByEmail(email: string): Promise<BetaSignup | undefined> {
    const [signup] = await db
      .select()
      .from(betaSignups)
      .where(eq(betaSignups.email, email));
    return signup || undefined;
  }

  async getBetaSignup(id: string): Promise<BetaSignup | undefined> {
    const [signup] = await db
      .select()
      .from(betaSignups)
      .where(eq(betaSignups.id, id));
    return signup || undefined;
  }

  async listBetaSignups(): Promise<BetaSignup[]> {
    return db.select().from(betaSignups).orderBy(desc(betaSignups.createdAt));
  }

  async updateBetaSignupStatus(
    id: string,
    status: "approved" | "rejected",
  ): Promise<BetaSignup | undefined> {
    const [updated] = await db
      .update(betaSignups)
      .set({ status, reviewedAt: new Date() })
      .where(eq(betaSignups.id, id))
      .returning();
    return updated || undefined;
  }

  async createCommentReport(data: {
    reporterId?: string | null;
    publicationId: string;
    articleId: number;
    commentId: number;
    commentAuthorId: number;
    commentAuthorName: string;
    commentAuthorKey: string;
    commentExcerpt: string;
    reason: string;
  }): Promise<CommentReport> {
    const [report] = await db
      .insert(commentReports)
      .values({
        reporterId: data.reporterId || null,
        publicationId: data.publicationId,
        articleId: data.articleId,
        commentId: data.commentId,
        commentAuthorId: data.commentAuthorId,
        commentAuthorName: data.commentAuthorName,
        commentAuthorKey: data.commentAuthorKey,
        commentExcerpt: data.commentExcerpt,
        reason: data.reason,
      })
      .returning();
    return report;
  }

  async listCommentReports(): Promise<CommentReportWithUser[]> {
    return db
      .select({
        id: commentReports.id,
        reporterId: commentReports.reporterId,
        publicationId: commentReports.publicationId,
        articleId: commentReports.articleId,
        commentId: commentReports.commentId,
        commentAuthorId: commentReports.commentAuthorId,
        commentAuthorName: commentReports.commentAuthorName,
        commentAuthorKey: commentReports.commentAuthorKey,
        commentExcerpt: commentReports.commentExcerpt,
        reason: commentReports.reason,
        status: commentReports.status,
        createdAt: commentReports.createdAt,
        resolvedAt: commentReports.resolvedAt,
        reporterEmail: users.email,
        reporterDisplayName: users.displayName,
      })
      .from(commentReports)
      .leftJoin(users, eq(commentReports.reporterId, users.id))
      .orderBy(desc(commentReports.createdAt));
  }

  async getCommentReport(id: string): Promise<CommentReport | undefined> {
    const [report] = await db
      .select()
      .from(commentReports)
      .where(eq(commentReports.id, id));
    return report || undefined;
  }

  async resolveCommentReport(id: string): Promise<CommentReport | undefined> {
    const [updated] = await db
      .update(commentReports)
      .set({ status: "removed", resolvedAt: new Date() })
      .where(eq(commentReports.id, id))
      .returning();
    return updated || undefined;
  }

  async createUserBlock(data: {
    blockerId: string;
    publicationId: string;
    blockedAuthorKey: string;
    blockedAuthorName: string;
    sourceCommentId?: number | null;
    sourceArticleId?: number | null;
    sourceExcerpt?: string | null;
  }): Promise<UserBlock> {
    const [block] = await db
      .insert(userBlocks)
      .values({
        blockerId: data.blockerId,
        publicationId: data.publicationId,
        blockedAuthorKey: data.blockedAuthorKey,
        blockedAuthorName: data.blockedAuthorName,
        sourceCommentId: data.sourceCommentId || null,
        sourceArticleId: data.sourceArticleId || null,
        sourceExcerpt: data.sourceExcerpt || null,
      })
      .onConflictDoNothing()
      .returning();
    if (block) return block;
    const [existing] = await db
      .select()
      .from(userBlocks)
      .where(
        and(
          eq(userBlocks.blockerId, data.blockerId),
          eq(userBlocks.publicationId, data.publicationId),
          eq(userBlocks.blockedAuthorKey, data.blockedAuthorKey),
        ),
      );
    if (!existing) {
      throw new Error("Failed to save block");
    }
    return existing;
  }

  async listUserBlocks(blockerId: string): Promise<UserBlock[]> {
    return db
      .select()
      .from(userBlocks)
      .where(eq(userBlocks.blockerId, blockerId))
      .orderBy(desc(userBlocks.createdAt));
  }

  async deleteUserBlock(
    blockerId: string,
    publicationId: string,
    blockedAuthorKey: string,
  ): Promise<boolean> {
    const deleted = await db
      .delete(userBlocks)
      .where(
        and(
          eq(userBlocks.blockerId, blockerId),
          eq(userBlocks.publicationId, publicationId),
          eq(userBlocks.blockedAuthorKey, blockedAuthorKey),
        ),
      )
      .returning();
    return deleted.length > 0;
  }

  async suspendUser(id: string): Promise<void> {
    await db
      .update(users)
      .set({ suspendedAt: new Date() })
      .where(eq(users.id, id));
  }

  async suspendUserByEmail(email: string): Promise<User | undefined> {
    const [updated] = await db
      .update(users)
      .set({ suspendedAt: new Date() })
      .where(eq(users.email, email))
      .returning();
    return updated || undefined;
  }
}

export const storage = new DatabaseStorage();
