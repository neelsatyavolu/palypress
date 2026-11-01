import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";

// Replaces google-auth-library's verifyIdToken, which does not run on
// Cloudflare Workers. Same checks: Google's signing keys, issuer, audience
// and expiry.
const GOOGLE_JWKS = createRemoteJWKSet(
  new URL("https://www.googleapis.com/oauth2/v3/certs"),
);
const GOOGLE_ISSUERS = ["accounts.google.com", "https://accounts.google.com"];

export type GoogleIdTokenPayload = JWTPayload & {
  sub: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
};

export async function verifyGoogleIdToken(
  idToken: string,
  audience: Array<string | undefined>,
): Promise<GoogleIdTokenPayload> {
  const { payload } = await jwtVerify(idToken, GOOGLE_JWKS, {
    issuer: GOOGLE_ISSUERS,
    audience: audience.filter((value): value is string => Boolean(value)),
  });
  if (!payload.sub) {
    throw new Error("Invalid Google token");
  }
  return payload as GoogleIdTokenPayload;
}
