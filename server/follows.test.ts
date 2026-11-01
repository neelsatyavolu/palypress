const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");

const storageSource = readFileSync(
  path.join(process.cwd(), "server/storage.ts"),
  "utf8",
);

// Test that interface contains getFollows signature
assert.match(
  storageSource,
  /getFollows\(userId:\s*string\):\s*Promise<string\[\]>;/,
  "storage interface should expose getFollows",
);

// Test that interface contains addFollow signature
assert.match(
  storageSource,
  /addFollow\(userId:\s*string,\s*publicationId:\s*string\):\s*Promise<void>;/,
  "storage interface should expose addFollow",
);

// Test that interface contains removeFollow signature
assert.match(
  storageSource,
  /removeFollow\(userId:\s*string,\s*publicationId:\s*string\):\s*Promise<void>;/,
  "storage interface should expose removeFollow",
);

// Test that addFollow uses insert and onConflictDoNothing
assert.match(
  storageSource,
  /async\s+addFollow\([\s\S]*?\):\s*Promise<void>[\s\S]*?db[\s\S]*?\.insert\(publicationFollows\)[\s\S]*?\.onConflictDoNothing\(\)/,
  "addFollow should use db.insert(publicationFollows) and chain onConflictDoNothing",
);

// Test that removeFollow uses delete with both userId and publicationId filters
assert.match(
  storageSource,
  /async\s+removeFollow\([\s\S]*?\):\s*Promise<void>[\s\S]*?\.delete\(publicationFollows\)[\s\S]*?and\([\s\S]*?eq\(publicationFollows\.userId[\s\S]*?eq\(publicationFollows\.publicationId/,
  "removeFollow should use db.delete(publicationFollows).where(and(...)) filtering on both userId and publicationId columns",
);

// Test that getFollows filters by userId
assert.match(
  storageSource,
  /async\s+getFollows\([\s\S]*?\):\s*Promise<string\[\]>[\s\S]*?\.where\([\s\S]*?eq\(publicationFollows\.userId/,
  "getFollows should filter by userId in WHERE clause",
);

// Test that getFollows selects publicationId
assert.match(
  storageSource,
  /async\s+getFollows\([\s\S]*?\):\s*Promise<string\[\]>[\s\S]*?\.select\(\s*{\s*publicationId:\s*publicationFollows\.publicationId\s*}\s*\)/,
  "getFollows should select publicationId field",
);

// Test that routes.ts has all three routes registered
const routesSource = readFileSync(
  path.join(process.cwd(), "server/routes.ts"),
  "utf8",
);

assert.match(
  routesSource,
  /app\.get\(\s*["']\/api\/follows["']/,
  "routes should register GET /api/follows",
);

assert.match(
  routesSource,
  /app\.post\(\s*["']\/api\/follows["']/,
  "routes should register POST /api/follows",
);

assert.match(
  routesSource,
  /app\.delete\(\s*["']\/api\/follows\/:publicationId["']/,
  "routes should register DELETE /api/follows/:publicationId",
);

// Test that routes call storage functions
assert.match(
  routesSource,
  /storage\.getFollows\s*\(/,
  "routes should call storage.getFollows",
);

assert.match(
  routesSource,
  /storage\.addFollow\s*\(/,
  "routes should call storage.addFollow",
);

assert.match(
  routesSource,
  /storage\.removeFollow\s*\(/,
  "routes should call storage.removeFollow",
);

// Test that routes reference VALID_PUBLICATION_IDS
assert.match(
  routesSource,
  /VALID_PUBLICATION_IDS/,
  "routes should reference VALID_PUBLICATION_IDS constant",
);

// Test that routes import and use insertFollowSchema
assert.match(
  routesSource,
  /insertFollowSchema/,
  "routes should use insertFollowSchema",
);

console.log("All tests passed!");
