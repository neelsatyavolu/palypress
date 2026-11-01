const assert = require("node:assert/strict");
const nodeCrypto = require("node:crypto");

process.env.ENCRYPTION_KEY = nodeCrypto.randomBytes(32).toString("base64");

const {
  encrypt,
  decrypt,
  encryptNullable,
  decryptNullable,
} = require("./encryption");

// Round trip
const plaintext = "super-secret-token-value";
const encrypted = encrypt(plaintext);
assert.notEqual(encrypted, plaintext, "encrypted value should differ from plaintext");
assert.equal(decrypt(encrypted), plaintext, "decrypt(encrypt(x)) should equal x");

// Random IV means repeated encryption of the same plaintext differs
const encryptedAgain = encrypt(plaintext);
assert.notEqual(
  encrypted,
  encryptedAgain,
  "encrypting the same plaintext twice should produce different ciphertext",
);
assert.equal(decrypt(encryptedAgain), plaintext);

// Legacy plaintext (written before encryption existed) passes through unchanged
const legacyValue = "JBSWY3DPEHPK3PXP";
assert.equal(
  decrypt(legacyValue),
  legacyValue,
  "decrypt should pass through values that aren't in our encrypted format",
);

// Nullable helpers
assert.equal(encryptNullable(null), null);
assert.equal(encryptNullable(undefined), null);
assert.equal(decryptNullable(null), null);
assert.equal(decryptNullable(undefined), null);
const wrapped = encryptNullable(plaintext);
assert.equal(decryptNullable(wrapped), plaintext);

// Missing key fails fast with a clear error
const savedKey = process.env.ENCRYPTION_KEY;
delete process.env.ENCRYPTION_KEY;
assert.throws(
  () => encrypt("anything"),
  /ENCRYPTION_KEY/,
  "encrypt should throw a clear error when ENCRYPTION_KEY is not set",
);
process.env.ENCRYPTION_KEY = savedKey;

// Wrong-length key fails fast with a clear error
process.env.ENCRYPTION_KEY = Buffer.from("too-short").toString("base64");
assert.throws(
  () => encrypt("anything"),
  /ENCRYPTION_KEY/,
  "encrypt should throw a clear error when ENCRYPTION_KEY is the wrong length",
);
process.env.ENCRYPTION_KEY = savedKey;

console.log("encryption.test.ts: all assertions passed");
