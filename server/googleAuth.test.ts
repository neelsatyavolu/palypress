import assert from "node:assert/strict";
import * as jose from "jose";
import { verifyGoogleIdToken } from "./googleAuth";

const GOOGLE_CERTS_URL = "https://www.googleapis.com/oauth2/v3/certs";
const WEB_CLIENT_ID = "web-client.apps.googleusercontent.com";
const IOS_CLIENT_ID = "ios-client.apps.googleusercontent.com";

async function signToken(
  privateKey: jose.CryptoKey,
  options: {
    issuer?: string;
    audience?: string;
    expired?: boolean;
    kid?: string;
  } = {},
) {
  return new jose.SignJWT({ email: "reader@example.com", email_verified: true })
    .setProtectedHeader({ alg: "RS256", kid: options.kid ?? "google-kid" })
    .setIssuer(options.issuer ?? "https://accounts.google.com")
    .setAudience(options.audience ?? IOS_CLIENT_ID)
    .setSubject("google-user-1")
    .setIssuedAt()
    .setExpirationTime(options.expired ? "-1m" : "5m")
    .sign(privateKey);
}

async function run() {
  const { privateKey, publicKey } = await jose.generateKeyPair("RS256");
  const { privateKey: otherKey } = await jose.generateKeyPair("RS256");
  const jwk = await jose.exportJWK(publicKey);
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input) => {
    assert.equal(String(input), GOOGLE_CERTS_URL, "Unexpected network request");
    return Response.json({
      keys: [{ ...jwk, kid: "google-kid", alg: "RS256", use: "sig" }],
    });
  };

  const audience = [WEB_CLIENT_ID, IOS_CLIENT_ID, undefined];
  const rejects = async (token: string, message: string) => {
    await assert.rejects(verifyGoogleIdToken(token, audience), Error, message);
  };

  try {
    const payload = await verifyGoogleIdToken(await signToken(privateKey), audience);
    assert.equal(payload.sub, "google-user-1");
    assert.equal(payload.email, "reader@example.com");
    assert.equal(payload.email_verified, true);

    const bareIssuer = await verifyGoogleIdToken(
      await signToken(privateKey, { issuer: "accounts.google.com" }),
      audience,
    );
    assert.equal(bareIssuer.sub, "google-user-1", "Google also issues without https://");

    await rejects(
      await signToken(privateKey, { audience: "someone-else.apps.googleusercontent.com" }),
      "Tokens for another app must be rejected",
    );
    await rejects(
      await signToken(privateKey, { issuer: "https://evil.example.com" }),
      "Tokens from another issuer must be rejected",
    );
    await rejects(
      await signToken(privateKey, { expired: true }),
      "Expired tokens must be rejected",
    );
    await rejects(
      await signToken(otherKey),
      "Tokens not signed by Google's key must be rejected",
    );
    console.log("Google ID token verification passed");
  } finally {
    globalThis.fetch = originalFetch;
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
