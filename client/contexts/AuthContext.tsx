import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { Platform } from "react-native";
import { getApiUrl, apiRequest, clearCsrfToken } from "@/lib/query-client";
import {
  identifyUser,
  resetUser,
  trackAccountCreated,
  trackSignedIn,
  trackSignedOut,
} from "@/lib/analytics";

// Lazy-load Google Sign-In so the app doesn't crash in Expo Go / web where the native module isn't present.
type GoogleSignInModule = {
  GoogleSignin: {
    configure: (config: object) => void;
    hasPlayServices: () => Promise<void>;
    signIn: () => Promise<unknown>;
    signOut: () => Promise<void>;
    getTokens: () => Promise<{ accessToken: string }>;
  };
  statusCodes: Record<string, string>;
  isSuccessResponse: (r: unknown) => boolean;
  isErrorWithCode: (e: unknown) => boolean;
};

let googleSignInModule: GoogleSignInModule | null = null;
let configureAttempted = false;
let googleIdentityScriptPromise: Promise<void> | null = null;

function parseJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = `${base64}${"=".repeat((4 - (base64.length % 4)) % 4)}`;
    const json = atob(padded);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function loadGoogleIdentityScript(): Promise<void> {
  if (googleIdentityScriptPromise) return googleIdentityScriptPromise;

  googleIdentityScriptPromise = new Promise((resolve, reject) => {
    if (typeof document === "undefined") {
      reject(new Error("Google Sign-In is only available in the browser"));
      return;
    }

    const existing = document.querySelector<HTMLScriptElement>(
      'script[src="https://accounts.google.com/gsi/client"]',
    );
    if (existing) {
      if ((window as any).google?.accounts?.id) {
        resolve();
      } else {
        existing.addEventListener("load", () => resolve(), { once: true });
        existing.addEventListener(
          "error",
          () => reject(new Error("Failed to load Google Sign-In SDK")),
          { once: true },
        );
      }
      return;
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () =>
      reject(new Error("Failed to load Google Sign-In SDK"));
    document.head.appendChild(script);
  });

  return googleIdentityScriptPromise;
}

function getGoogleSignIn(): GoogleSignInModule | null {
  if (googleSignInModule !== null) return googleSignInModule;
  if (configureAttempted) return null;
  try {
    const mod =
      require("@react-native-google-signin/google-signin") as GoogleSignInModule;
    mod.GoogleSignin.configure({
      webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
      iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
      scopes: [
        "https://www.googleapis.com/auth/userinfo.email",
        "https://www.googleapis.com/auth/userinfo.profile",
      ],
      offlineAccess: true,
    });
    googleSignInModule = mod;
    return mod;
  } catch {
    configureAttempted = true;
    return null;
  }
}

interface User {
  id: string;
  googleId?: string | null;
  appleId?: string | null;
  email: string;
  displayName: string | null;
  photoUrl: string | null;
  studentId: string | null;
  emailVerified: boolean;
  weeklyDigestEnabled: boolean;
  twoFactorEnabled?: boolean;
  hasPassword?: boolean;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signInWithGoogle: () => Promise<{
    success: boolean;
    error?: string;
    requires2FA?: boolean;
  }>;
  signInWithApple: () => Promise<{
    success: boolean;
    error?: string;
    requires2FA?: boolean;
  }>;
  signInWithEmail: (
    email: string,
    password: string,
  ) => Promise<{
    success: boolean;
    error?: string;
    emailVerified?: boolean;
    userId?: string;
    requires2FA?: boolean;
  }>;
  signUpWithEmail: (
    email: string,
    password: string,
    displayName: string,
    agreedToTerms: boolean,
  ) => Promise<{
    success: boolean;
    error?: string;
    userId?: string;
  }>;
  verifyEmail: (token: string) => Promise<{ success: boolean; error?: string }>;
  resendVerificationEmail: (
    email: string,
  ) => Promise<{ success: boolean; error?: string }>;
  requestPasswordReset: (
    email: string,
  ) => Promise<{ success: boolean; error?: string }>;
  resetPassword: (
    token: string,
    newPassword: string,
  ) => Promise<{ success: boolean; error?: string }>;
  verify2FA: (
    token: string,
    isBackupCode?: boolean,
  ) => Promise<{ success: boolean; error?: string }>;
  setPassword: (
    newPassword: string,
    currentPassword?: string,
  ) => Promise<{ success: boolean; error?: string }>;
  setup2FA: () => Promise<{
    success: boolean;
    secret?: string;
    qrCode?: string;
    backupCodes?: string[];
    error?: string;
  }>;
  verify2FASetup: (
    token: string,
  ) => Promise<{ success: boolean; error?: string }>;
  disable2FA: (
    password: string,
    token: string,
  ) => Promise<{ success: boolean; error?: string }>;
  deleteAccount: () => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateProfile: (
    displayName: string,
  ) => Promise<{ success: boolean; error?: string }>;
  getGoogleAccessToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const response = await fetch(
        new URL("/api/auth/me", getApiUrl()).toString(),
        {
          credentials: "include",
        },
      );
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error("Failed to refresh user:", error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  // Link analytics to the account whenever a user is present (login or
  // restored session). identify() is idempotent, so re-running is safe.
  useEffect(() => {
    if (user) {
      identifyUser(user.id, user.email);
    }
  }, [user]);

  const handleWebGoogleIdToken = async (idToken: string) => {
    const payload = parseJwtPayload(idToken);
    const email = String(payload?.email || "");
    const googleId = String(payload?.sub || "");
    const displayName = typeof payload?.name === "string" ? payload.name : null;
    const photoUrl =
      typeof payload?.picture === "string" ? payload.picture : null;

    if (!email || !googleId) {
      return { success: false, error: "Invalid Google sign-in response" };
    }

    const serverResponse = await apiRequest("POST", "/api/auth/google", {
      idToken,
      user: {
        googleId,
        email,
        displayName,
        photoUrl,
      },
    });
    const data = await serverResponse.json();

    if (!serverResponse.ok) {
      return { success: false, error: data.error };
    }

    if (data.requires2FA) {
      return { success: true, requires2FA: true };
    }

    setUser(data.user);
    trackSignedIn({ authMethod: "google" });
    return { success: true };
  };

  useEffect(() => {
    if (Platform.OS !== "web") return;
    if (typeof window === "undefined") return;

    const hash = window.location.hash;
    if (!hash || !hash.includes("id_token=")) return;

    const params = new URLSearchParams(hash.replace(/^#/, ""));
    const idToken = params.get("id_token");

    if (!idToken) return;

    if (window.opener) {
      window.opener.postMessage(
        { type: "google-id-token", idToken },
        window.location.origin,
      );
      window.close();
      return;
    }

    handleWebGoogleIdToken(idToken).finally(() => {
      const cleanUrl = `${window.location.pathname}${window.location.search}`;
      window.history.replaceState({}, document.title, cleanUrl);
    });
  }, []);

  const signInWithGoogle = async () => {
    if (Platform.OS === "web") {
      try {
        const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
        if (!webClientId) {
          return {
            success: false,
            error: "Google web client ID is not configured",
          };
        }

        const origin = window.location.origin;
        const redirectUri = `${origin}/app`;
        const state = Math.random().toString(36).slice(2);
        const nonce = Math.random().toString(36).slice(2);

        const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
        authUrl.searchParams.set("client_id", webClientId);
        authUrl.searchParams.set("redirect_uri", redirectUri);
        authUrl.searchParams.set("response_type", "id_token");
        authUrl.searchParams.set("scope", "openid email profile");
        authUrl.searchParams.set("prompt", "select_account");
        authUrl.searchParams.set("state", state);
        authUrl.searchParams.set("nonce", nonce);

        const popup = window.open(
          authUrl.toString(),
          "_blank",
          "width=520,height=640",
        );

        if (!popup) {
          return {
            success: false,
            error: "Popup blocked. Please allow popups and try again.",
          };
        }

        const result = await new Promise<{
          idToken: string;
        }>((resolve, reject) => {
          let settled = false;
          const finish = (value?: { idToken: string }, error?: Error) => {
            if (settled) return;
            settled = true;
            window.removeEventListener("message", onMessage);
            if (error) {
              reject(error);
            } else if (value) {
              resolve(value);
            } else {
              reject(new Error("Google sign-in cancelled"));
            }
          };

          const onMessage = (event: MessageEvent) => {
            if (event.origin !== window.location.origin) return;
            if (!event.data || event.data.type !== "google-id-token") return;
            if (!event.data.idToken) {
              finish(undefined, new Error("Google sign-in cancelled"));
              return;
            }
            finish({ idToken: String(event.data.idToken) });
          };

          window.addEventListener("message", onMessage);

          setTimeout(() => {
            finish(
              undefined,
              new Error("Google sign-in timed out. Please try again."),
            );
          }, 60000);
        });

        return await handleWebGoogleIdToken(result.idToken);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Google sign-in failed";
        return { success: false, error: message };
      }
    }

    const gsi = getGoogleSignIn();
    if (!gsi) {
      return {
        success: false,
        error:
          "Google Sign-In is not available in this build. Use a development or production build (expo run:ios / expo run:android) for native sign-in.",
      };
    }
    const { GoogleSignin, statusCodes, isSuccessResponse, isErrorWithCode } =
      gsi;
    try {
      if (Platform.OS === "android") {
        await GoogleSignin.hasPlayServices();
      }

      const response = await GoogleSignin.signIn();

      if (!isSuccessResponse(response)) {
        return { success: false, error: "Sign in was cancelled" };
      }

      const signInData = (
        response as {
          data: {
            idToken: string;
            user: {
              id: string;
              email: string;
              name: string;
              photo: string | null;
            };
          };
        }
      ).data;
      const { idToken, user: userInfo } = signInData;

      // Get access token for API calls
      const tokens = await GoogleSignin.getTokens();

      const serverResponse = await fetch(
        new URL("/api/auth/google", getApiUrl()),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            idToken,
            accessToken: tokens.accessToken,
            user: {
              googleId: userInfo.id,
              email: userInfo.email,
              displayName: userInfo.name,
              photoUrl: userInfo.photo,
            },
          }),
          credentials: "include",
        },
      );
      const data = await serverResponse.json().catch(() => ({}));

      if (!serverResponse.ok) {
        return {
          success: false,
          error:
            typeof data.error === "string"
              ? data.error
              : "Failed to sign in with Google",
        };
      }

      // Check if 2FA is required
      if (data.requires2FA) {
        return { success: true, requires2FA: true };
      }

      setUser(data.user);
      trackSignedIn({ authMethod: "google" });
      return { success: true };
    } catch (error) {
      if (isErrorWithCode(error)) {
        const err = error as { code: string };
        switch (err.code) {
          case statusCodes.SIGN_IN_CANCELLED:
            return { success: false, error: "Sign in was cancelled" };
          case statusCodes.IN_PROGRESS:
            return { success: false, error: "Sign in is already in progress" };
          case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
            return {
              success: false,
              error: "Google Play Services not available",
            };
          default:
            return { success: false, error: `Sign in failed: ${err.code}` };
        }
      }
      console.error("Google Sign-In error:", error);
      const message =
        error instanceof Error && error.message
          ? error.message
          : "Failed to sign in with Google";
      return { success: false, error: message };
    }
  };

  const signInWithApple = async () => {
    if (Platform.OS !== "ios") {
      return {
        success: false,
        error: "Sign in with Apple is only available on iOS",
      };
    }

    try {
      const AppleAuthentication = await import("expo-apple-authentication");
      const available = await AppleAuthentication.isAvailableAsync();
      if (!available) {
        return {
          success: false,
          error: "Sign in with Apple is not available on this device",
        };
      }

      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (!credential.identityToken) {
        return {
          success: false,
          error: "Apple did not return an identity token",
        };
      }

      const serverResponse = await fetch(
        new URL("/api/auth/apple", getApiUrl()),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            identityToken: credential.identityToken,
            fullName: credential.fullName
              ? {
                  givenName: credential.fullName.givenName,
                  familyName: credential.fullName.familyName,
                }
              : undefined,
          }),
          credentials: "include",
        },
      );
      const data = await serverResponse.json().catch(() => ({}));

      if (!serverResponse.ok) {
        return {
          success: false,
          error:
            typeof data.error === "string"
              ? data.error
              : "Failed to sign in with Apple",
        };
      }

      if (data.requires2FA) {
        return { success: true, requires2FA: true };
      }

      setUser(data.user);
      trackSignedIn({ authMethod: "apple" });
      return { success: true };
    } catch (error) {
      const code =
        error && typeof error === "object" && "code" in error
          ? String((error as { code: string }).code)
          : "";
      const message =
        error instanceof Error ? error.message.toLowerCase() : "";
      if (
        code === "ERR_REQUEST_CANCELED" ||
        code === "ERR_CANCELED" ||
        code === "1001" ||
        message.includes("canceled") ||
        message.includes("cancelled")
      ) {
        return { success: false, error: "Sign in was cancelled" };
      }
      console.error("Apple Sign-In error:", error);
      return {
        success: false,
        error:
          error instanceof Error && error.message
            ? error.message
            : "Failed to sign in with Apple",
      };
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    try {
      const response = await fetch(
        new URL("/api/auth/email/signin", getApiUrl()),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
          credentials: "include",
        },
      );
      const data = await response.json();

      if (!response.ok) {
        if (response.status === 403 && data.emailVerified === false) {
          return {
            success: false,
            error: data.error,
            emailVerified: false,
            userId: data.userId,
          };
        }
        return { success: false, error: data.error };
      }

      // Check if 2FA is required
      if (data.requires2FA) {
        return { success: true, requires2FA: true };
      }

      setUser(data.user);
      trackSignedIn({ authMethod: "email" });
      return { success: true };
    } catch (error) {
      console.error("Email sign-in error:", error);
      return { success: false, error: "Failed to sign in" };
    }
  };

  const signUpWithEmail = async (
    email: string,
    password: string,
    displayName: string,
    agreedToTerms: boolean,
  ) => {
    try {
      const response = await fetch(
        new URL("/api/auth/email/signup", getApiUrl()),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, displayName, agreedToTerms }),
          credentials: "include",
        },
      );
      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error };
      }

      if (data.userId) {
        trackAccountCreated(data.userId);
      }

      return { success: true, userId: data.userId };
    } catch (error) {
      console.error("Email sign-up error:", error);
      return { success: false, error: "Failed to create account" };
    }
  };

  const verifyEmail = async (token: string) => {
    try {
      const response = await fetch(
        new URL("/api/auth/email/verify", getApiUrl()),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
          credentials: "include",
        },
      );
      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error };
      }

      setUser(data.user);
      return { success: true };
    } catch (error) {
      console.error("Email verification error:", error);
      return { success: false, error: "Failed to verify email" };
    }
  };

  const resendVerificationEmail = async (email: string) => {
    try {
      const response = await fetch(
        new URL("/api/auth/email/resend-verification", getApiUrl()),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
          credentials: "include",
        },
      );
      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error };
      }

      return { success: true };
    } catch (error) {
      console.error("Resend verification error:", error);
      return { success: false, error: "Failed to resend verification email" };
    }
  };

  const requestPasswordReset = async (email: string) => {
    try {
      const response = await fetch(
        new URL("/api/auth/password/forgot", getApiUrl()),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
          credentials: "include",
        },
      );
      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error };
      }

      return { success: true };
    } catch (error) {
      console.error("Request password reset error:", error);
      return { success: false, error: "Failed to request password reset" };
    }
  };

  const resetPassword = async (token: string, newPassword: string) => {
    try {
      const response = await fetch(
        new URL("/api/auth/password/reset", getApiUrl()),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, newPassword }),
          credentials: "include",
        },
      );
      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error };
      }

      return { success: true };
    } catch (error) {
      console.error("Reset password error:", error);
      return { success: false, error: "Failed to reset password" };
    }
  };

  const signOut = async () => {
    try {
      const gsi = getGoogleSignIn();
      if (gsi) {
        await gsi.GoogleSignin.signOut();
      }
      // Sign out from backend
      await apiRequest("POST", "/api/auth/signout", {});
      setUser(null);
      // Clear CSRF token on logout
      clearCsrfToken();
      // Capture sign-out before detaching analytics session
      trackSignedOut();
      // Detach analytics from the account
      resetUser();
    } catch (error) {
      console.error("Failed to sign out:", error);
    }
  };

  const deleteAccount = async () => {
    try {
      const gsi = getGoogleSignIn();
      if (gsi) {
        try {
          await gsi.GoogleSignin.signOut();
        } catch (error) {
          console.error("Failed to sign out of Google:", error);
        }
      }

      await apiRequest("DELETE", "/api/auth/account", {});
      setUser(null);
      clearCsrfToken();
      trackSignedOut();
      resetUser();
      return { success: true };
    } catch (error) {
      console.error("Failed to delete account:", error);
      return { success: false, error: "Failed to delete account" };
    }
  };

  const updateProfile = async (displayName: string) => {
    try {
      const response = await apiRequest("PATCH", "/api/auth/profile", {
        displayName,
      });
      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error };
      }

      setUser(data.user);
      return { success: true };
    } catch {
      return { success: false, error: "Failed to update profile" };
    }
  };

  const verify2FA = async (token: string, isBackupCode = false) => {
    try {
      const response = await fetch(
        new URL("/api/auth/signin-2fa", getApiUrl()),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, isBackupCode }),
          credentials: "include",
        },
      );
      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error };
      }

      setUser(data.user);
      return { success: true };
    } catch (error) {
      console.error("2FA verification error:", error);
      return { success: false, error: "Failed to verify 2FA code" };
    }
  };

  const setPassword = async (newPassword: string, currentPassword?: string) => {
    try {
      const response = await fetch(
        new URL("/api/auth/password/set", getApiUrl()),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ newPassword, currentPassword }),
          credentials: "include",
        },
      );
      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error };
      }

      if (data.user) {
        setUser(data.user);
      } else {
        await refreshUser();
      }

      return { success: true };
    } catch (error) {
      console.error("Set password error:", error);
      return { success: false, error: "Failed to set password" };
    }
  };

  const setup2FA = async () => {
    try {
      const response = await fetch(
        new URL("/api/auth/2fa/setup", getApiUrl()),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        },
      );
      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error };
      }

      return {
        success: true,
        secret: data.secret,
        qrCode: data.qrCode,
        backupCodes: data.backupCodes,
      };
    } catch (error) {
      console.error("Setup 2FA error:", error);
      return { success: false, error: "Failed to setup 2FA" };
    }
  };

  const verify2FASetup = async (token: string) => {
    try {
      const response = await fetch(
        new URL("/api/auth/2fa/verify-setup", getApiUrl()),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
          credentials: "include",
        },
      );
      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error };
      }

      // Refresh user to get updated 2FA status
      await refreshUser();
      return { success: true };
    } catch (error) {
      console.error("Verify 2FA setup error:", error);
      return { success: false, error: "Failed to verify 2FA setup" };
    }
  };

  const disable2FA = async (password: string, token: string) => {
    try {
      const response = await fetch(
        new URL("/api/auth/2fa/disable", getApiUrl()),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password, token }),
          credentials: "include",
        },
      );
      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error };
      }

      // Refresh user to get updated 2FA status
      await refreshUser();
      return { success: true };
    } catch (error) {
      console.error("Disable 2FA error:", error);
      return { success: false, error: "Failed to disable 2FA" };
    }
  };

  const getGoogleAccessToken = async (): Promise<string | null> => {
    const gsi = getGoogleSignIn();
    if (!gsi) return null;
    try {
      const tokens = await gsi.GoogleSignin.getTokens();
      return tokens.accessToken;
    } catch (error) {
      console.error("Failed to get Google access token:", error);
      return null;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        signInWithGoogle,
        signInWithApple,
        signInWithEmail,
        signUpWithEmail,
        verifyEmail,
        resendVerificationEmail,
        requestPasswordReset,
        resetPassword,
        verify2FA,
        setPassword,
        setup2FA,
        verify2FASetup,
        disable2FA,
        deleteAccount,
        signOut,
        refreshUser,
        updateProfile,
        getGoogleAccessToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
