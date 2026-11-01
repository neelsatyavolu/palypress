import assert from "node:assert/strict";

import {
  getPasswordRuleStatuses,
  getPasswordStrength,
  validatePassword,
} from "./passwordPolicy";

const emptyStatuses = getPasswordRuleStatuses("");

assert.deepEqual(
  emptyStatuses.map((status) => status.label),
  [
    "At least 10 characters",
    "At most 100 characters",
    "At least one uppercase letter",
    "At least one lowercase letter",
    "At least one number",
    "At least one special character",
  ],
  "password rules should clearly list the server-enforced requirements",
);

assert.equal(
  validatePassword("short").isValid,
  false,
  "short passwords should be invalid",
);

assert.equal(
  validatePassword("alllowercase1!").errors[0],
  "Password must contain at least one uppercase letter",
  "validation should report the first missing requirement",
);

assert.equal(
  validatePassword("ValidPass1!").isValid,
  true,
  "passwords satisfying every requirement should be valid",
);

assert.equal(
  getPasswordStrength(""),
  "empty",
  "empty passwords should not show a strength level",
);

assert.equal(
  getPasswordStrength("ValidPass1!"),
  "strong",
  "passwords meeting all requirements should be strong",
);
