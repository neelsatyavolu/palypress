import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { getApiUrl } from "./config";

// Re-export getApiUrl for convenience
export { getApiUrl };

// CSRF token cache
let csrfToken: string | null = null;

async function fetchCsrfToken(): Promise<string> {
  if (csrfToken) {
    return csrfToken;
  }
  const csrfUrl = new URL("/api/csrf-token", getApiUrl()).toString();
  const res = await fetch(csrfUrl, {
    credentials: "include",
  });
  if (res.ok) {
    const data = await res.json();
    csrfToken = data.csrfToken;
    return csrfToken!;
  }
  return "";
}

// Clear CSRF token (call on logout)
export function clearCsrfToken() {
  csrfToken = null;
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  route: string,
  data?: unknown | undefined,
): Promise<Response> {
  const baseUrl = getApiUrl();
  const url = new URL(route, baseUrl);

  const headers: Record<string, string> = {};
  if (data) {
    headers["Content-Type"] = "application/json";
  }

  // Add CSRF token for state-changing requests
  if (method !== "GET") {
    const token = await fetchCsrfToken();
    if (token) {
      headers["X-CSRF-Token"] = token;
    }
  }

  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const baseUrl = getApiUrl();
    const url = new URL(queryKey.join("/") as string, baseUrl);

    const res = await fetch(url, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
