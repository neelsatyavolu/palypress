import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const KEY_LENGTH = 32;
const PREFIX = "enc:v1:";

function getKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) {
    throw new Error("ENCRYPTION_KEY environment variable is required");
  }
  const key = Buffer.from(raw, "base64");
  if (key.length !== KEY_LENGTH) {
    throw new Error(
      `ENCRYPTION_KEY must be base64-encoded and decode to ${KEY_LENGTH} bytes`,
    );
  }
  return key;
}

// Encrypts a string at rest using AES-256-GCM. Output is prefixed so
// decrypt() can tell it apart from legacy plaintext values written
// before encryption was introduced.
export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return PREFIX + Buffer.concat([iv, authTag, ciphertext]).toString("base64");
}

// Decrypts a value produced by encrypt(). Values that don't carry our
// prefix are treated as legacy plaintext and returned unchanged, so
// existing rows keep working until they're next written (and re-encrypted).
export function decrypt(value: string): string {
  if (!value.startsWith(PREFIX)) {
    return value;
  }
  const key = getKey();
  const raw = Buffer.from(value.slice(PREFIX.length), "base64");
  const iv = raw.subarray(0, IV_LENGTH);
  const authTag = raw.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const ciphertext = raw.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]).toString("utf8");
}

export function encryptNullable(
  value: string | null | undefined,
): string | null {
  if (value === null || value === undefined) return null;
  return encrypt(value);
}

export function decryptNullable(
  value: string | null | undefined,
): string | null {
  if (value === null || value === undefined) return null;
  return decrypt(value);
}
