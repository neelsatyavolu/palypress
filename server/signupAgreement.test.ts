import assert from "node:assert/strict";
import { emailSignUpSchema } from "../shared/schema";

const validSignup = {
  email: "test@example.com",
  password: "Str0ng!Password",
  displayName: "Test User",
  agreedToTerms: true,
};

// Signup with agreement passes
assert.equal(emailSignUpSchema.safeParse(validSignup).success, true);

// Missing agreement is rejected
const missing = emailSignUpSchema.safeParse({
  email: validSignup.email,
  password: validSignup.password,
  displayName: validSignup.displayName,
});
assert.equal(missing.success, false);

// Explicit false is rejected
const declined = emailSignUpSchema.safeParse({
  ...validSignup,
  agreedToTerms: false,
});
assert.equal(declined.success, false);
if (!declined.success) {
  assert.match(
    declined.error.issues[0].message,
    /Terms of Service and Privacy Policy/,
  );
}
