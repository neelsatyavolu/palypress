import assert from "node:assert/strict";
import express, {
  type Request,
  type Response,
  type RequestHandler,
} from "express";
import * as jose from "jose";
import type { User } from "@shared/schema";
import { APPLE_JWKS_URL } from "./appleAuth";

async function run() {
  // Imports require configuration, but this test must never access a database
  // or send email. The real route runs with only storage and JWKS substituted.
  // The Neon driver queries over fetch, so the fetch stub below also fails
  // any database access.
  process.env.DATABASE_URL = "postgres://test:test@127.0.0.1:1/test";
  process.env.RESEND_API_KEY = "re_test_placeholder";
  process.env.NODE_ENV = "test";
  const { registerRoutes } = await import("./routes");
  const { storage } = await import("./storage");
  const originals = {
    getUserByAppleId: storage.getUserByAppleId,
    getUserByEmail: storage.getUserByEmail,
    createAppleUser: storage.createAppleUser,
    updateAppleUser: storage.updateAppleUser,
  };
  const originalFetch = globalThis.fetch;
  const { privateKey, publicKey } = await jose.generateKeyPair("RS256");
  const jwk = await jose.exportJWK(publicKey);
  globalThis.fetch = async (input) => {
    assert.equal(String(input), APPLE_JWKS_URL, "Unexpected network request");
    return Response.json({
      keys: [{ ...jwk, kid: "flow-test", alg: "RS256", use: "sig" }],
    });
  };

  let user: User | undefined;
  let creations = 0;
  let emailLookups = 0;
  let updates = 0;
  storage.getUserByAppleId = async (appleId) => {
    assert.equal(appleId, "apple-flow-user");
    return user;
  };
  storage.getUserByEmail = async (email) => {
    emailLookups++;
    assert.equal(email, "hidden@privaterelay.appleid.com");
    return undefined;
  };
  storage.createAppleUser = async (input) => {
    creations++;
    assert.deepEqual(input, {
      appleId: "apple-flow-user",
      email: "hidden@privaterelay.appleid.com",
      displayName: "Test Reader",
      studentId: null,
    });
    user = {
      ...input,
      id: "flow-user-id",
      emailVerified: true,
      twoFactorEnabled: false,
      passwordHash: null,
    } as User;
    return user;
  };
  storage.updateAppleUser = async (id, name) => {
    updates++;
    assert.equal(id, user?.id);
    assert.equal(name, null, "Returning login must preserve the original name");
    return user;
  };

  try {
    const app = express();
    let appleHandler: RequestHandler | undefined;
    const originalPost = app.post.bind(app);
    app.post = ((path: string, ...handlers: RequestHandler[]) => {
      if (path === "/api/auth/apple") appleHandler = handlers[0];
      return originalPost(path, ...handlers);
    }) as typeof app.post;
    await registerRoutes(app);
    assert.ok(
      appleHandler,
      "The actual Apple sign-in route must be registered",
    );

    async function login(claims: Record<string, unknown>, firstLogin = false) {
      const identityToken = await new jose.SignJWT(claims)
        .setProtectedHeader({ alg: "RS256", kid: "flow-test" })
        .setIssuer("https://appleid.apple.com")
        .setAudience("com.palyjournalism.app")
        .setSubject("apple-flow-user")
        .setExpirationTime("5m")
        .sign(privateKey);
      const session: Record<string, unknown> = {};
      let status = 200;
      let body: any;
      const response = {
        status(code: number) {
          status = code;
          return response;
        },
        json(value: unknown) {
          body = value;
          return response;
        },
      };
      await appleHandler!(
        {
          body: {
            identityToken,
            ...(firstLogin && {
              fullName: { givenName: "Test", familyName: "Reader" },
            }),
          },
          session,
        } as unknown as Request,
        response as unknown as Response,
        () => assert.fail("Unexpected middleware continuation"),
      );
      assert.equal(status, 200, JSON.stringify(body));
      return { session, body };
    }

    const first = await login(
      { email: "hidden@privaterelay.appleid.com", email_verified: "true" },
      true,
    );
    assert.equal(first.session.userId, "flow-user-id");
    assert.equal(first.body.user.email, "hidden@privaterelay.appleid.com");
    assert.equal(first.body.user.hasPassword, false);

    const returning = await login({});
    assert.equal(returning.session.userId, "flow-user-id");
    assert.equal(returning.body.user.displayName, "Test Reader");
    assert.equal(returning.body.user.email, first.body.user.email);
    assert.equal(creations, 1);
    assert.equal(
      emailLookups,
      1,
      "Returning users must be resolved by Apple ID",
    );

    user!.twoFactorEnabled = true;
    const twoFactor = await login({});
    assert.equal(twoFactor.body.requires2FA, true);
    assert.equal(twoFactor.session.pending2FAUserId, "flow-user-id");
    assert.equal(twoFactor.session.userId, undefined);
    assert.equal(twoFactor.body.user, undefined);
    assert.equal(updates, 2);
    console.log("Apple route flow passed: new user, returning user, and 2FA");
  } finally {
    Object.assign(storage, originals);
    globalThis.fetch = originalFetch;
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
