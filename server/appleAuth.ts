import { createPublicKey, verify as cryptoVerify, type KeyLike } from "node:crypto";

export const APPLE_ISSUER = "https://appleid.apple.com";
export const APPLE_JWKS_URL = "https://appleid.apple.com/auth/keys";

export type AppleIdentityPayload = {
  appleId: string;
  email: string | null;
  emailVerified: boolean | null;
};

export function resolveAppleAccountEmail(
  appleId: string,
  email: string | null,
): string {
  if (email && email.includes("@")) {
    return email;
  }
  const safeId =
    appleId.replace(/[^A-Za-z0-9._-]/g, "").slice(0, 80) || "unknown";
  return `appleid-${safeId}@users.palyjournalism.com`;
}

export function getAppleAudience(): string[] {
  const configured = process.env.APPLE_CLIENT_ID || "com.palyjournalism.app";
  return Array.from(new Set([configured, "com.palyjournalism.app"]));
}

function isEmailVerified(value: unknown): boolean | null {
  if (value === true || value === "true") return true;
  if (value === false || value === "false") return false;
  return null;
}

function decodeSegment(segment: string): string {
  return Buffer.from(segment, "base64url").toString("utf8");
}

async function keyFromAppleJwks(kid?: string): Promise<KeyLike> {
  const response = await fetch(APPLE_JWKS_URL);
  if (!response.ok) {
    throw new Error("Invalid Apple identity token");
  }
  const body = (await response.json()) as {
    keys?: Array<Record<string, string>>;
  };
  const jwk = body.keys?.find(
    (key) =>
      key.kid === kid &&
      key.kty === "RSA" &&
      key.alg === "RS256" &&
      key.use === "sig",
  );
  if (!jwk) {
    throw new Error("Invalid Apple identity token");
  }
  return createPublicKey({ key: jwk, format: "jwk" });
}

function audienceMatches(
  claimed: unknown,
  expected: string | string[],
): boolean {
  const allowed = Array.isArray(expected) ? expected : [expected];
  const values = Array.isArray(claimed) ? claimed : [claimed];
  return values.some(
    (value) => typeof value === "string" && allowed.includes(value),
  );
}

export async function verifyAppleIdentityToken(
  identityToken: string,
  options: {
    audience?: string | string[];
    getKey?: (header: { kid?: string; alg?: string }) => Promise<KeyLike>;
  } = {},
): Promise<AppleIdentityPayload> {
  try {
    const parts = identityToken.split(".");
    if (parts.length !== 3) {
      throw new Error("Invalid Apple identity token");
    }
    const [encodedHeader, encodedPayload, encodedSignature] = parts;
    const header = JSON.parse(decodeSegment(encodedHeader)) as {
      kid?: string;
      alg?: string;
    };
    const payload = JSON.parse(decodeSegment(encodedPayload)) as {
      iss?: string;
      aud?: string | string[];
      sub?: string;
      exp?: number;
      email?: unknown;
      email_verified?: unknown;
    };

    // Apple signs identity tokens with RS256. ES256 is for the developer's
    // client secret used by Apple's token endpoint, not the user's identity.
    if (header.alg !== "RS256") {
      console.error("Apple identity token rejected: alg", header.alg);
      throw new Error("Invalid Apple identity token");
    }

    const key = options.getKey
      ? await options.getKey(header)
      : await keyFromAppleJwks(header.kid);
    const valid = cryptoVerify(
      "sha256",
      Buffer.from(`${encodedHeader}.${encodedPayload}`),
      key,
      Buffer.from(encodedSignature, "base64url"),
    );
    if (!valid) {
      throw new Error("Invalid Apple identity token");
    }

    const now = Math.floor(Date.now() / 1000);
    if (payload.iss !== APPLE_ISSUER) {
      console.error("Apple identity token rejected: iss", payload.iss);
      throw new Error("Invalid Apple identity token");
    }
    const expectedAudience = options.audience ?? getAppleAudience();
    if (!audienceMatches(payload.aud, expectedAudience)) {
      console.error("Apple identity token rejected: aud", {
        claimed: payload.aud,
        expected: expectedAudience,
      });
      throw new Error("Invalid Apple identity token");
    }
    if (typeof payload.exp !== "number" || payload.exp <= now) {
      console.error("Apple identity token rejected: exp", payload.exp, now);
      throw new Error("Invalid Apple identity token");
    }
    if (!payload.sub) {
      console.error("Apple identity token rejected: missing sub");
      throw new Error("Invalid Apple identity token");
    }

    return {
      appleId: payload.sub,
      email: typeof payload.email === "string" ? payload.email : null,
      emailVerified: isEmailVerified(payload.email_verified),
    };
  } catch (error) {
    if (
      !(error instanceof Error) ||
      error.message !== "Invalid Apple identity token"
    ) {
      console.error("Apple identity token verification failed", error);
    }
    throw new Error("Invalid Apple identity token");
  }
}
