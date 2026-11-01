import { Resend } from "resend";

if (!process.env.RESEND_API_KEY) {
  throw new Error("RESEND_API_KEY is not set in environment variables");
}

const resend = new Resend(process.env.RESEND_API_KEY);
const fromEmail = process.env.FROM_EMAIL || "onboarding@resend.dev";
const teamEmail = process.env.TEAM_EMAIL || "team@palyjournalism.com";
const appUrl = process.env.APP_URL || "https://palyjournalism.com";
const appName = "PALY Press";

interface SendVerificationEmailOptions {
  to: string;
  code: string;
}

export async function sendVerificationEmail({
  to,
  code,
}: SendVerificationEmailOptions): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to,
      subject: `Verify your ${appName} account`,
      html: getVerificationEmailTemplate(code),
    });

    if (error) {
      console.error("Resend error:", error);
      return { success: false, error: error.message };
    }

    console.log("Verification email sent successfully:", data?.id);
    return { success: true };
  } catch (error: any) {
    console.error("Failed to send verification email:", error);
    return { success: false, error: error.message || "Failed to send email" };
  }
}

export async function sendPasswordResetEmail({
  to,
  code,
}: SendVerificationEmailOptions): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to,
      subject: `Reset your ${appName} password`,
      html: getPasswordResetEmailTemplate(code),
    });

    if (error) {
      console.error("Resend error:", error);
      return { success: false, error: error.message };
    }

    console.log("Password reset email sent successfully:", data?.id);
    return { success: true };
  } catch (error: any) {
    console.error("Failed to send password reset email:", error);
    return { success: false, error: error.message || "Failed to send email" };
  }
}

function getVerificationEmailTemplate(code: string): string {
  return getCodeEmailTemplate({
    title: "Verify your email",
    intro:
      "Thanks for signing up. Use this verification code in the app to finish creating your account.",
    code,
    detail:
      "This code expires in 15 minutes. Once verified, you can save stories, comment, and follow Paly journalism in PALY Press.",
    safety:
      "If you didn't create an account with PALY Press, you can safely ignore this email.",
  });
}

function getPasswordResetEmailTemplate(code: string): string {
  return getCodeEmailTemplate({
    title: "Reset your password",
    intro: "Use this code in the app to choose a new password.",
    code,
    detail: "This code expires in 15 minutes.",
    safety:
      "If you did not request a password reset, you can safely ignore this email.",
  });
}

function getCodeEmailTemplate({
  title,
  intro,
  code,
  detail,
  safety,
}: {
  title: string;
  intro: string;
  code: string;
  detail: string;
  safety: string;
}): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f2f2f2;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f2f2f2; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border: 1px solid #e5e5e5; border-radius: 24px; overflow: hidden; box-shadow: 0 12px 32px rgba(17,24,28,0.08);">
          <tr>
            <td style="padding: 28px 32px 0;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="border-top: 4px solid #007aff; border-radius: 4px; line-height: 4px; font-size: 4px;">&nbsp;</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 28px 32px 36px;">
              <p style="display: inline-block; margin: 0 0 18px; padding: 7px 10px; border-radius: 999px; background-color: #edf5ff; color: #007aff; font-size: 11px; line-height: 14px; font-weight: 700; letter-spacing: 0.8px; text-transform: uppercase;">
                ${appName}
              </p>
              <h1 style="margin: 0 0 12px; color: #11181c; font-size: 30px; line-height: 36px; font-weight: 700;">
                ${title}
              </h1>
              <p style="margin: 0; color: #666666; font-size: 16px; line-height: 24px;">
                ${intro}
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 28px 0;">
                <tr>
                  <td align="center" style="background-color: #f8fbff; border: 1px solid #d8eaff; border-radius: 18px; padding: 26px 20px;">
                    <div style="font-size: 34px; line-height: 42px; font-weight: 700; letter-spacing: 7px; color: #007aff; font-family: SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;">
                      ${code}
                    </div>
                  </td>
                </tr>
              </table>
              <p style="margin: 0; color: #666666; font-size: 14px; line-height: 21px;">
                ${detail}
              </p>
              <p style="margin: 18px 0 0; color: #999999; font-size: 12px; line-height: 18px;">
                ${safety}
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #fafafa; padding: 22px 32px; border-top: 1px solid #eeeeee;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="color: #999999; font-size: 12px; line-height: 18px;">
                    © ${new Date().getFullYear()} ${appName}. All rights reserved.
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

const ROLE_LABELS: Record<string, string> = {
  student: "Student",
  staff: "Staff",
  parent: "Parent",
  alumni: "Alumni",
};

interface BetaSignupNotificationOptions {
  name: string;
  email: string;
  role: string;
}

export async function sendBetaSignupNotification({
  name,
  email,
  role,
}: BetaSignupNotificationOptions): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: teamEmail,
      replyTo: email,
      subject: `New beta signup: ${name}`,
      html: getBetaNotificationTemplate({ name, email, role }),
    });

    if (error) {
      console.error("Resend error:", error);
      return { success: false, error: error.message };
    }

    console.log("Beta signup notification sent successfully:", data?.id);
    return { success: true };
  } catch (error: any) {
    console.error("Failed to send beta signup notification:", error);
    return { success: false, error: error.message || "Failed to send email" };
  }
}

interface BetaApprovalEmailOptions {
  to: string;
  name: string;
}

export async function sendBetaApprovalEmail({
  to,
  name,
}: BetaApprovalEmailOptions): Promise<{
  success: boolean;
  error?: string;
}> {
  const testflightUrl = process.env.TESTFLIGHT_URL;
  if (!testflightUrl) {
    return {
      success: false,
      error: "TESTFLIGHT_URL is not set in environment variables",
    };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to,
      subject: `You're in! Welcome to the ${appName} beta`,
      html: getBetaApprovalTemplate({ name, testflightUrl }),
    });

    if (error) {
      console.error("Resend error:", error);
      return { success: false, error: error.message };
    }

    console.log("Beta approval email sent successfully:", data?.id);
    return { success: true };
  } catch (error: any) {
    console.error("Failed to send beta approval email:", error);
    return { success: false, error: error.message || "Failed to send email" };
  }
}

interface FeedbackNotificationOptions {
  message: string;
  userName?: string;
  userEmail?: string;
}

export async function sendModerationAlert({
  kind,
  reason,
  commentAuthorName,
  commentExcerpt,
  publicationId,
  articleId,
  commentId,
  reporterEmail,
}: {
  kind: "report" | "block";
  reason?: string;
  commentAuthorName: string;
  commentExcerpt: string;
  publicationId: string;
  articleId?: number;
  commentId?: number;
  reporterEmail?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const subject =
      kind === "block"
        ? `User blocked ${commentAuthorName} in PALY Press`
        : `Comment reported in PALY Press`;
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: teamEmail,
      replyTo: reporterEmail || undefined,
      subject,
      html: getEmailShell({
        title: kind === "block" ? "Author blocked" : "Comment reported",
        badge: "Moderation",
        accent: "#9b1c1c",
        bodyHtml: `
      <p style="margin: 0 0 24px; color: #666666; font-size: 16px; line-height: 24px;">
        Act on this within 24 hours: remove the comment if it violates the terms, and suspend the account if the author is abusive.
      </p>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 8px; border: 1px solid #e5e5e5; border-radius: 14px; overflow: hidden;">
        <tr>
          <td style="padding: 14px 18px; background-color: #fafafa; color: #11181c; font-size: 14px; font-weight: 600; width: 140px;">Type</td>
          <td style="padding: 14px 18px; color: #11181c; font-size: 14px;">${escapeHtml(kind)}</td>
        </tr>
        <tr>
          <td style="padding: 14px 18px; background-color: #fafafa; color: #11181c; font-size: 14px; font-weight: 600; border-top: 1px solid #e5e5e5;">Author</td>
          <td style="padding: 14px 18px; color: #11181c; font-size: 14px; border-top: 1px solid #e5e5e5;">${escapeHtml(commentAuthorName)}</td>
        </tr>
        <tr>
          <td style="padding: 14px 18px; background-color: #fafafa; color: #11181c; font-size: 14px; font-weight: 600; border-top: 1px solid #e5e5e5;">Publication</td>
          <td style="padding: 14px 18px; color: #11181c; font-size: 14px; border-top: 1px solid #e5e5e5;">${escapeHtml(publicationId)}${articleId ? ` / article ${articleId}` : ""}${commentId ? ` / comment ${commentId}` : ""}</td>
        </tr>
        ${
          reason
            ? `<tr>
          <td style="padding: 14px 18px; background-color: #fafafa; color: #11181c; font-size: 14px; font-weight: 600; border-top: 1px solid #e5e5e5;">Reason</td>
          <td style="padding: 14px 18px; color: #11181c; font-size: 14px; border-top: 1px solid #e5e5e5;">${escapeHtml(reason)}</td>
        </tr>`
            : ""
        }
        ${
          reporterEmail
            ? `<tr>
          <td style="padding: 14px 18px; background-color: #fafafa; color: #11181c; font-size: 14px; font-weight: 600; border-top: 1px solid #e5e5e5;">Reporter</td>
          <td style="padding: 14px 18px; color: #11181c; font-size: 14px; border-top: 1px solid #e5e5e5;">${escapeHtml(reporterEmail)}</td>
        </tr>`
            : ""
        }
        <tr>
          <td style="padding: 14px 18px; background-color: #fafafa; color: #11181c; font-size: 14px; font-weight: 600; vertical-align: top; border-top: 1px solid #e5e5e5;">Comment</td>
          <td style="padding: 14px 18px; color: #11181c; font-size: 14px; white-space: pre-wrap; border-top: 1px solid #e5e5e5;">${escapeHtml(commentExcerpt)}</td>
        </tr>
      </table>
      <p style="margin: 24px 0 0; color: #999999; font-size: 13px; line-height: 20px;">
        Review and remove this from the admin dashboard at ${escapeHtml(appUrl)}/admin
      </p>
        `,
      }),
    });

    if (error) {
      console.error("Resend error:", error);
      return { success: false, error: error.message };
    }

    console.log("Moderation alert sent:", data?.id);
    return { success: true };
  } catch (error: any) {
    console.error("Failed to send moderation alert:", error);
    return { success: false, error: error.message || "Failed to send email" };
  }
}

export async function sendFeedbackNotification({
  message,
  userName,
  userEmail,
}: FeedbackNotificationOptions): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: teamEmail,
      replyTo: userEmail || undefined,
      subject: `New app feedback${userName ? ` from ${userName}` : ""}`,
      html: getFeedbackNotificationTemplate({ message, userName, userEmail }),
    });

    if (error) {
      console.error("Resend error:", error);
      return { success: false, error: error.message };
    }

    console.log("Feedback notification sent successfully:", data?.id);
    return { success: true };
  } catch (error: any) {
    console.error("Failed to send feedback notification:", error);
    return { success: false, error: error.message || "Failed to send email" };
  }
}

function getFeedbackNotificationTemplate({
  message,
  userName,
  userEmail,
}: FeedbackNotificationOptions): string {
  const senderLabel = userName || userEmail || "An app user";
  return getEmailShell({
    title: "New app feedback",
    badge: "Feedback",
    accent: "#1b5e3f",
    bodyHtml: `
      <p style="margin: 0 0 24px; color: #666666; font-size: 16px; line-height: 24px;">
        ${escapeHtml(senderLabel)} just sent feedback through the ${appName} app.
      </p>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 8px; border: 1px solid #e5e5e5; border-radius: 14px; overflow: hidden;">
        ${
          userEmail
            ? `<tr>
          <td style="padding: 14px 18px; background-color: #fafafa; color: #11181c; font-size: 14px; font-weight: 600; width: 120px;">Email</td>
          <td style="padding: 14px 18px; color: #11181c; font-size: 14px;"><a href="mailto:${escapeHtml(userEmail)}" style="color: #1b5e3f;">${escapeHtml(userEmail)}</a></td>
        </tr>`
            : ""
        }
        <tr>
          <td style="padding: 14px 18px; background-color: #fafafa; color: #11181c; font-size: 14px; font-weight: 600; vertical-align: top;${userEmail ? " border-top: 1px solid #e5e5e5;" : ""}">Message</td>
          <td style="padding: 14px 18px; color: #11181c; font-size: 14px; white-space: pre-wrap;${userEmail ? " border-top: 1px solid #e5e5e5;" : ""}">${escapeHtml(message)}</td>
        </tr>
      </table>
      <p style="margin: 24px 0 0; color: #999999; font-size: 13px; line-height: 20px;">
        ${userEmail ? "Reply to this email to respond directly." : "View all feedback from the admin dashboard."}
      </p>
    `,
  });
}

function getBetaNotificationTemplate({
  name,
  email,
  role,
}: BetaSignupNotificationOptions): string {
  const roleLabel = ROLE_LABELS[role] || role;
  return getEmailShell({
    title: "New beta signup",
    badge: "Beta program",
    accent: "#1b5e3f",
    bodyHtml: `
      <p style="margin: 0 0 24px; color: #666666; font-size: 16px; line-height: 24px;">
        Someone just requested access to the ${appName} beta.
      </p>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 8px; border: 1px solid #e5e5e5; border-radius: 14px; overflow: hidden;">
        <tr>
          <td style="padding: 14px 18px; background-color: #fafafa; color: #11181c; font-size: 14px; font-weight: 600; width: 120px;">Name</td>
          <td style="padding: 14px 18px; color: #11181c; font-size: 14px;">${escapeHtml(name)}</td>
        </tr>
        <tr>
          <td style="padding: 14px 18px; background-color: #fafafa; color: #11181c; font-size: 14px; font-weight: 600; border-top: 1px solid #e5e5e5;">Email</td>
          <td style="padding: 14px 18px; color: #11181c; font-size: 14px; border-top: 1px solid #e5e5e5;"><a href="mailto:${escapeHtml(email)}" style="color: #1b5e3f;">${escapeHtml(email)}</a></td>
        </tr>
        <tr>
          <td style="padding: 14px 18px; background-color: #fafafa; color: #11181c; font-size: 14px; font-weight: 600; border-top: 1px solid #e5e5e5;">Role</td>
          <td style="padding: 14px 18px; color: #11181c; font-size: 14px; border-top: 1px solid #e5e5e5;">${escapeHtml(roleLabel)}</td>
        </tr>
      </table>
      <p style="margin: 24px 0 0; color: #999999; font-size: 13px; line-height: 20px;">
        Review and approve this applicant from the admin dashboard. Reply to this email to reach them directly.
      </p>
    `,
  });
}

function getBetaApprovalTemplate({
  name,
  testflightUrl,
}: {
  name: string;
  testflightUrl: string;
}): string {
  return getEmailShell({
    title: "You're in!",
    badge: "Beta access granted",
    accent: "#1b5e3f",
    bodyHtml: `
      <p style="margin: 0 0 18px; color: #666666; font-size: 16px; line-height: 24px;">
        Hi ${escapeHtml(name)}, you've been approved for the ${appName} beta. Tap the button below to install TestFlight (if you don't have it) and download the beta.
      </p>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin: 28px 0;">
        <tr>
          <td align="center">
            <a href="${escapeHtml(testflightUrl)}" style="display: inline-block; background-color: #1b5e3f; color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; padding: 15px 32px; border-radius: 12px;">
              Open in TestFlight
            </a>
          </td>
        </tr>
      </table>
      <p style="margin: 0; color: #666666; font-size: 14px; line-height: 21px;">
        If the button doesn't work, copy and paste this link into Safari on your iPhone:<br>
        <a href="${escapeHtml(testflightUrl)}" style="color: #1b5e3f; word-break: break-all;">${escapeHtml(testflightUrl)}</a>
      </p>
      <p style="margin: 18px 0 0; color: #999999; font-size: 12px; line-height: 18px;">
        Found a bug or have feedback? Just reply to this email — we'd love to hear from you.
      </p>
    `,
  });
}

export interface DigestStory {
  publicationName: string;
  publicationColor: string;
  categoryName: string | null;
  title: string;
  author: string | null;
  readTimeMinutes: number;
  upvotes: number;
  imageUrl: string | null;
  url: string;
}

interface WeeklyDigestEmailOptions {
  to: string;
  weekRangeLabel: string;
  stories: DigestStory[];
}

export async function sendWeeklyDigestEmail({
  to,
  weekRangeLabel,
  stories,
}: WeeklyDigestEmailOptions): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to,
      subject: "Your week in PALY Press",
      html: getWeeklyDigestEmailTemplate({ weekRangeLabel, stories }),
    });

    if (error) {
      console.error("Resend error:", error);
      return { success: false, error: error.message };
    }

    console.log("Weekly digest email sent successfully:", data?.id);
    return { success: true };
  } catch (error: any) {
    console.error("Failed to send weekly digest email:", error);
    return { success: false, error: error.message || "Failed to send email" };
  }
}

function shortPublicationLabel(name: string): string {
  const stripped = name.replace(/^The\s+/i, "");
  const words = stripped.split(" ");
  return words.length <= 2 ? stripped : words[0];
}

export function getWeeklyDigestEmailTemplate({
  weekRangeLabel,
  stories,
}: {
  weekRangeLabel: string;
  stories: DigestStory[];
}): string {
  const storyRows = stories
    .map((story, index) => getDigestStoryRowTemplate(story, index === 0))
    .join("");

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your week in PALY Press</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f2f2f2;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f2f2f2; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border: 1px solid #e5e5e5; border-radius: 24px; overflow: hidden; box-shadow: 0 12px 32px rgba(17,24,28,0.08);">
          <tr>
            <td style="padding: 28px 32px 0;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr><td style="border-top: 4px solid #007aff; border-radius: 4px; line-height: 4px; font-size: 4px;">&nbsp;</td></tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 28px 32px 8px;">
              <p style="display: inline-block; margin: 0 0 18px; padding: 7px 10px; border-radius: 999px; background-color: #edf5ff; color: #007aff; font-size: 11px; line-height: 14px; font-weight: 700; letter-spacing: 0.8px; text-transform: uppercase;">
                ${appName}
              </p>
              <h1 style="margin: 0 0 8px; color: #11181c; font-size: 26px; line-height: 32px; font-weight: 700; letter-spacing: -0.4px;">
                Your week in PALY Press
              </h1>
              <p style="margin: 0; color: #666666; font-size: 15px; line-height: 22px;">
                The ${stories.length === 1 ? "most" : `${stories.length} most`}-read ${stories.length === 1 ? "story" : "stories"} across all publications this week — picked up automatically from your Home feed's top upvotes.
              </p>
              <p style="margin: 10px 0 0; color: #999999; font-size: 12px; line-height: 17px;">
                ${escapeHtml(weekRangeLabel)}
              </p>
            </td>
          </tr>
          ${storyRows}
          <tr>
            <td style="padding: 28px 32px 36px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${appUrl}" style="display: inline-block; background-color: #007aff; color: #ffffff; font-size: 15px; font-weight: 650; text-decoration: none; padding: 14px 30px; border-radius: 999px; font-family: -apple-system, sans-serif;">
                      Open the app
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background-color: #fafafa; padding: 22px 32px; border-top: 1px solid #eeeeee;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="color: #999999; font-size: 12px; line-height: 18px;">
                    © ${new Date().getFullYear()} ${appName}. All rights reserved.<br />
                    You're receiving this because weekly digest emails are on for your account.
                    <a href="${appUrl}" style="color: #007aff; text-decoration: none;">Manage preferences</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

function getDigestStoryRowTemplate(story: DigestStory, isFirst: boolean): string {
  const eyebrow = story.categoryName
    ? `${escapeHtml(story.publicationName)} · ${escapeHtml(story.categoryName)}`
    : escapeHtml(story.publicationName);

  const byline = [
    story.author ? `By ${escapeHtml(story.author)}` : null,
    `${story.readTimeMinutes} min read`,
    `${story.upvotes} ${story.upvotes === 1 ? "upvote" : "upvotes"}`,
  ]
    .filter(Boolean)
    .join(" · ");

  const thumbnail = story.imageUrl
    ? `<img src="${escapeHtml(story.imageUrl)}" width="88" height="66" alt="" style="display:block; width:88px; height:66px; border-radius:10px; object-fit:cover;" />`
    : `<table cellpadding="0" cellspacing="0" width="88" height="66" style="border-radius: 10px; background: linear-gradient(135deg, ${story.publicationColor}22, ${story.publicationColor}0d);">
         <tr><td align="center" valign="middle" style="width:88px;height:66px;color:${story.publicationColor};font-size:11px;font-weight:700;font-family:-apple-system,sans-serif;">${escapeHtml(shortPublicationLabel(story.publicationName))}</td></tr>
       </table>`;

  return `
          <tr>
            <td style="padding: 20px 32px 0;">
              <table width="100%" cellpadding="0" cellspacing="0" style="${isFirst ? "" : "border-top: 1px solid #eeeeee;"} padding-top: 20px;">
                <tr>
                  <td width="88" valign="top" style="padding-right: 16px;">
                    <a href="${escapeHtml(story.url)}" style="text-decoration: none;">${thumbnail}</a>
                  </td>
                  <td valign="top">
                    <p style="margin: 0 0 4px;">
                      <span style="display:inline-block; width:7px; height:7px; border-radius:50%; background:${story.publicationColor}; margin-right:6px; vertical-align:middle;"></span>
                      <span style="font-size: 11px; font-weight: 700; letter-spacing: 0.4px; text-transform: uppercase; color: ${story.publicationColor}; vertical-align:middle;">${eyebrow}</span>
                    </p>
                    <p style="margin: 0 0 4px; font-size: 17px; line-height: 22px; font-weight: 700; color: #11181c;">
                      <a href="${escapeHtml(story.url)}" style="color: #11181c; text-decoration: none;">${escapeHtml(story.title)}</a>
                    </p>
                    <p style="margin: 0; font-size: 13px; line-height: 19px; color: #666666;">
                      ${byline}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getEmailShell({
  title,
  badge,
  accent,
  bodyHtml,
}: {
  title: string;
  badge: string;
  accent: string;
  bodyHtml: string;
}): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f2f2f2;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f2f2f2; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border: 1px solid #e5e5e5; border-radius: 24px; overflow: hidden; box-shadow: 0 12px 32px rgba(17,24,28,0.08);">
          <tr>
            <td style="padding: 28px 32px 0;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="border-top: 4px solid ${accent}; border-radius: 4px; line-height: 4px; font-size: 4px;">&nbsp;</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 28px 32px 36px;">
              <p style="display: inline-block; margin: 0 0 18px; padding: 7px 10px; border-radius: 999px; background-color: #ecf7f0; color: ${accent}; font-size: 11px; line-height: 14px; font-weight: 700; letter-spacing: 0.8px; text-transform: uppercase;">
                ${badge}
              </p>
              <h1 style="margin: 0 0 18px; color: #11181c; font-size: 30px; line-height: 36px; font-weight: 700;">
                ${title}
              </h1>
              ${bodyHtml}
            </td>
          </tr>
          <tr>
            <td style="background-color: #fafafa; padding: 22px 32px; border-top: 1px solid #eeeeee;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="color: #999999; font-size: 12px; line-height: 18px;">
                    © ${new Date().getFullYear()} ${appName}. All rights reserved.
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}
