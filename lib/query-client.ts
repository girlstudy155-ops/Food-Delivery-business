import { Platform } from "react-native";
import { QueryClient, QueryFunction } from "@tanstack/react-query";

/**
 * Auto-detect backend URL for Expo / React Native / Web
 */
export function getApiUrl(): string {
  return "https://food-delivery-business-production-00a9.up.railway.app/";
}
/**
 * Helper: Throw error if response not ok
 */
async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

/**
 * General API request helper (GET, POST, PUT, DELETE)
 */
export async function apiRequest(
  method: "GET" | "POST" | "PUT" | "DELETE",
  route: string,
  data?: unknown
): Promise<any> {
  const baseUrl = getApiUrl();
  const url = new URL(route, baseUrl);

  const res = await fetch(url.toString(), {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include", // Optional for cookies
  });

  await throwIfResNotOk(res);
  return res.json();
}

/**
 * React Query GET query function
 */
type UnauthorizedBehavior = "returnNull" | "throw";

export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const baseUrl = getApiUrl();
    const url = new URL(queryKey.join("/") as string, baseUrl);

    const res = await fetch(url.toString(), { credentials: "include" });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) return null;

    await throwIfResNotOk(res);
    return await res.json();
  };

/**
 * Default React Query Client
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});