import assert from "node:assert/strict";
import * as jose from "jose";
import {
  APPLE_JWKS_URL,
  resolveAppleAccountEmail,
  verifyAppleIdentityToken,
} from "./appleAuth";

async function signToken(
  privateKey: jose.CryptoKey,
  claims: Record<string, unknown>,
  options: {
    issuer?: string;
    audience?: string | string[];
    subject?: string;
    expired?: boolean;
  } = {},
) {
  const jwt = new jose.SignJWT(claims)
    .setProtectedHeader({ alg: "RS256", kid: "test-kid" })
    .setIssuer(options.issuer ?? "https://appleid.apple.com")
    .setAudience(options.audience ?? "com.palyjournalism.app")
    .setSubject(options.subject ?? "apple-user-1")
    .setIssuedAt();

  if (options.expired) {
    jwt.setExpirationTime("-1m");
  } else {
    jwt.setExpirationTime("5m");
  }

  return jwt.sign(privateKey);
}

async function run() {
  // Apple signs identity tokens with RSA; ES256 is for developer client secrets.
  const { privateKey, publicKey } = await jose.generateKeyPair("RS256");
  const getKey = async () => publicKey;

  const valid = await signToken(privateKey, {
    email: "hidden@privaterelay.appleid.com",
    email_verified: "true",
  });
  const payload = await verifyAppleIdentityToken(valid, {
    audience: "com.palyjournalism.app",
    getKey,
  });
  assert.equal(payload.appleId, "apple-user-1");
  assert.equal(payload.email, "hidden@privaterelay.appleid.com");
  assert.equal(payload.emailVerified, true);

  // Exercise the production JWKS lookup and JWK-to-KeyObject conversion too.
  const originalFetch = globalThis.fetch;
  const publicJwk = await jose.exportJWK(publicKey);
  const fetchedUrls: string[] = [];
  globalThis.fetch = async (input) => {
    fetchedUrls.push(String(input));
    return Response.json({
      keys: [{ ...publicJwk, kid: "test-kid", alg: "RS256", use: "sig" }],
    });
  };
  try {
    assert.deepEqual(
      await verifyAppleIdentityToken(valid, {
        audience: "com.palyjournalism.app",
      }),
      payload,
    );
    assert.deepEqual(fetchedUrls, [APPLE_JWKS_URL]);

    for (const invalidMetadata of [
      { kid: "unknown-kid" },
      { kty: "EC" },
      { alg: "ES256" },
      { use: "enc" },
    ]) {
      globalThis.fetch = async () =>
        Response.json({
          keys: [
            {
              ...publicJwk,
              kid: "test-kid",
              alg: "RS256",
              use: "sig",
              ...invalidMetadata,
            },
          ],
        });
      await assert.rejects(
        () => verifyAppleIdentityToken(valid),
        /invalid/i,
        `JWKS should reject ${JSON.stringify(invalidMetadata)}`,
      );
    }
  } finally {
    globalThis.fetch = originalFetch;
  }

  const booleanVerified = await signToken(
    privateKey,
    {
      email: "student@pausd.us",
      email_verified: true,
    },
    { subject: "apple-user-2" },
  );
  const booleanPayload = await verifyAppleIdentityToken(booleanVerified, {
    audience: "com.palyjournalism.app",
    getKey,
  });
  assert.equal(booleanPayload.emailVerified, true);
  assert.equal(booleanPayload.email, "student@pausd.us");

  const returningUser = await signToken(
    privateKey,
    {},
    { subject: "apple-user-3" },
  );
  const returningPayload = await verifyAppleIdentityToken(returningUser, {
    audience: "com.palyjournalism.app",
    getKey,
  });
  assert.equal(returningPayload.appleId, "apple-user-3");
  assert.equal(returningPayload.email, null);
  assert.equal(returningPayload.emailVerified, null);

  await assert.rejects(
    async () =>
      verifyAppleIdentityToken(
        await signToken(privateKey, {}, { issuer: "https://evil.example" }),
        { audience: "com.palyjournalism.app", getKey },
      ),
    /invalid/i,
  );

  await assert.rejects(
    async () =>
      verifyAppleIdentityToken(
        await signToken(privateKey, {}, { expired: true }),
        { getKey },
      ),
    /invalid/i,
  );

  const otherKeys = await jose.generateKeyPair("RS256");
  await assert.rejects(
    async () =>
      verifyAppleIdentityToken(await signToken(otherKeys.privateKey, {}), {
        getKey,
      }),
    /invalid/i,
  );

  const [header, claims, signature] = valid.split(".");
  const changedClaims = Buffer.from(
    JSON.stringify({
      ...JSON.parse(Buffer.from(claims, "base64url").toString()),
      sub: "different-user",
    }),
  ).toString("base64url");
  await assert.rejects(
    () =>
      verifyAppleIdentityToken(`${header}.${changedClaims}.${signature}`, {
        getKey,
      }),
    /invalid/i,
  );

  for (const alg of ["none", "HS256", "ES256"]) {
    const spoofedHeader = Buffer.from(
      JSON.stringify({ alg, kid: "test-kid" }),
    ).toString("base64url");
    await assert.rejects(
      () =>
        verifyAppleIdentityToken(`${spoofedHeader}.${claims}.${signature}`, {
          getKey,
        }),
      /invalid/i,
    );
  }

  const ecKeys = await jose.generateKeyPair("ES256");
  const ecToken = await new jose.SignJWT({})
    .setProtectedHeader({ alg: "ES256", kid: "ec-test-kid" })
    .setIssuer("https://appleid.apple.com")
    .setAudience("com.palyjournalism.app")
    .setSubject("apple-user-1")
    .setExpirationTime("5m")
    .sign(ecKeys.privateKey);
  await assert.rejects(
    () =>
      verifyAppleIdentityToken(ecToken, {
        getKey: async () => ecKeys.publicKey,
      }),
    /invalid/i,
  );

  await assert.rejects(
    async () =>
      verifyAppleIdentityToken(
        await signToken(privateKey, {}, { audience: "com.other.app" }),
        { audience: "com.palyjournalism.app", getKey },
      ),
    /invalid/i,
  );

  await assert.rejects(
    () =>
      verifyAppleIdentityToken("not-a-jwt", {
        audience: "com.palyjournalism.app",
        getKey,
      }),
    /invalid/i,
  );

  assert.equal(
    resolveAppleAccountEmail(
      "001234.abcdef",
      "hidden@privaterelay.appleid.com",
    ),
    "hidden@privaterelay.appleid.com",
  );
  assert.equal(
    resolveAppleAccountEmail("001234.abcdef", null),
    "appleid-001234.abcdef@users.palyjournalism.com",
  );
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
