import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

function visibleText(file: string): string {
  return fs
    .readFileSync(path.join(process.cwd(), "server", "templates", file), "utf8")
    .replace(/<style[\s\S]*?<\/style>/g, " ")
    .replace(/<script[\s\S]*?<\/script>/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&mdash;/g, "-")
    .replace(/\s+/g, " ")
    .toLowerCase();
}

const privacy = visibleText("privacy.html");
const terms = visibleText("terms.html");

const flaggedPhrases = [
  "we are committed to",
  "we take your privacy seriously",
  "safeguard",
  "cutting-edge",
  "seamless",
  "robust",
  "leverage",
];

for (const [name, text] of [
  ["privacy", privacy],
  ["terms", terms],
] as const) {
  for (const phrase of flaggedPhrases) {
    assert.equal(
      text.includes(phrase),
      false,
      `${name} page should avoid AI-style phrase: ${phrase}`,
    );
  }
}

// Disclosures that must stay in the privacy policy because they describe
// how the app actually works. If one of these fails after a feature change,
// update the policy, not the test.
const requiredPrivacyClaims = [
  "posthog",
  "resend",
  "expo",
  "cloudflare",
  "neon",
  "bcrypt",
  "aes-256-gcm",
  "comments are public",
  "delete your account",
  "weekly digest",
  "google calendar",
  "sign in with apple",
  "hide my email",
];

for (const claim of requiredPrivacyClaims) {
  assert.equal(
    privacy.includes(claim),
    true,
    `privacy policy should still disclose: ${claim}`,
  );
}

const requiredTermsClaims = [
  "not run by",
  "at least 13",
  "beta",
  "california",
  "24 hours",
  "report",
  "block",
];

for (const claim of requiredTermsClaims) {
  assert.equal(
    terms.includes(claim),
    true,
    `terms should still state: ${claim}`,
  );
}
