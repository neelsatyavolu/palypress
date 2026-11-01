const assert = require("node:assert/strict");
const { existsSync, readFileSync } = require("node:fs");
const path = require("node:path");

const read = (file) => {
  const fullPath = path.join(process.cwd(), file);
  return existsSync(fullPath) ? readFileSync(fullPath, "utf8") : "";
};

const routesSource = read("server/routes.ts");
const storageSource = read("server/storage.ts");
const schemaSource = read("shared/schema.ts");
const adminTemplate = read("server/templates/admin.html");
const migrationSource = read("migrations/0006_app_feedback.sql");

assert.match(
  schemaSource,
  /export const appFeedback = pgTable\(\s*"app_feedback"/,
  "schema should define the app_feedback table",
);

assert.match(
  schemaSource,
  /export const submitFeedbackSchema = z\.object/,
  "schema should validate submitted app feedback",
);

assert.match(
  storageSource,
  /createAppFeedback\(\s*userId:\s*string,[\s\S]*message:\s*string[\s\S]*\):\s*Promise<AppFeedback>/,
  "storage interface should expose createAppFeedback",
);

assert.match(
  storageSource,
  /listAppFeedback\(\):\s*Promise<AppFeedbackWithUser\[]>/,
  "storage interface should expose listAppFeedback",
);

assert.match(
  routesSource,
  /app\.post\("\/api\/feedback",\s*requireAuth/,
  "routes should register authenticated POST /api/feedback",
);

assert.match(
  routesSource,
  /submitFeedbackSchema\.safeParse\(req\.body\)/,
  "feedback route should validate request body",
);

assert.match(
  routesSource,
  /storage\.createAppFeedback\(userId,\s*\{\s*message/,
  "feedback route should persist validated feedback",
);

assert.match(
  routesSource,
  /app\.get\("\/api\/admin\/feedback",\s*requireAdmin/,
  "routes should register admin GET /api/admin/feedback",
);

assert.match(
  adminTemplate,
  /api\("\/api\/admin\/feedback"\)/,
  "admin dashboard should load app feedback",
);

assert.match(
  adminTemplate,
  /id="feedback-rows"/,
  "admin dashboard should render feedback rows",
);

assert.match(
  migrationSource,
  /CREATE TABLE "app_feedback"/,
  "migration should create the app_feedback table",
);
