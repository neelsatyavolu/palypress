const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");

const routesSource = readFileSync(
  path.join(process.cwd(), "server/routes.ts"),
  "utf8",
);
const storageSource = readFileSync(
  path.join(process.cwd(), "server/storage.ts"),
  "utf8",
);

assert.match(
  storageSource,
  /deleteUser\(id:\s*string\):\s*Promise<boolean>;/,
  "storage interface should expose deleteUser",
);

assert.match(
  storageSource,
  /async\s+deleteUser\(id:\s*string\):\s*Promise<boolean>[\s\S]*db\s*\.delete\(users\)/,
  "database storage should delete from users",
);

assert.match(
  routesSource,
  /app\.delete\("\/api\/auth\/account"/,
  "routes should register DELETE /api/auth/account",
);

assert.match(
  routesSource,
  /storage\.deleteUser\(userId\)/,
  "account deletion route should delete the authenticated user",
);

assert.match(
  routesSource,
  /req\.session\.destroy/,
  "account deletion route should destroy the session after deleting the account",
);
