// Production API configuration
export const API_CONFIG = {
  // Uses EXPO_PUBLIC_DOMAIN from .env file for native runtimes.
  baseUrl:
    process.env.EXPO_PUBLIC_DOMAIN ||
    (__DEV__
      ? "localhost:5000"
      : "api.palyjournalism.com"),
};

function normalizeOrigin(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";

  if (/^https?:\/\//i.test(trimmed)) {
    return new URL(trimmed).origin;
  }

  const protocol = trimmed.startsWith("localhost") ? "http" : "https";
  return new URL(`${protocol}://${trimmed}`).origin;
}

function ensureTrailingSlash(value: string): string {
  return value.endsWith("/") ? value : `${value}/`;
}

export function getApiUrl(): string {
  return ensureTrailingSlash(normalizeOrigin(API_CONFIG.baseUrl));
}
