import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const template = fs.readFileSync(
  path.join(process.cwd(), "server", "templates", "beta.html"),
  "utf8",
);

assert.match(
  template,
  /<strong class="spam-note">Check your spam folder or whitelist emails from noreply@palyjournalism\.com\.<\/strong>/,
);

assert.match(
  template,
  /\.spam-note\s*\{[^}]*font-weight:\s*700;[^}]*text-decoration:\s*underline;/s,
);
