import { useCallback, useMemo, useState } from "react";
import { AUTH_START_URL, PHOTOS_TOKEN_URL } from "../services/supabaseConfig";

function currentUrl() {
  return typeof window !== "undefined" ? window.location.href : "";
}

export function usePhotosToken() {
  const [lastError, setLastError] = useState<string | null>(null);
  const [isFetching, setIsFetching] = useState(false);
  const [hasSession, setHasSession] = useState<boolean | null>(null);

  const ensureAccessToken = useCallback(async () => {
    setIsFetching(true);
    setLastError(null);
    try {
      const response = await fetch(PHOTOS_TOKEN_URL, {
        method: "GET",
        credentials: "include",
      });

      if (response.status === 401) {
        setHasSession(false);
        throw new Error("Not authenticated. Please sign in.");
      }

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "Failed to fetch access token");
      }

      const body = (await response.json()) as {
        accessToken: string;
        expiresIn?: number;
      };
      setHasSession(true);
      return body.accessToken;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown error fetching token";
      setLastError(message);
      throw error;
    } finally {
      setIsFetching(false);
    }
  }, []);

  const startSignIn = useCallback(() => {
    const redirect = encodeURIComponent(currentUrl());
    const target = `${AUTH_START_URL}?redirect_to=${redirect}`;
    window.location.href = target;
  }, []);

  return useMemo(
    () => ({
      ensureAccessToken,
      startSignIn,
      isFetching,
      hasSession,
      lastError,
    }),
    [ensureAccessToken, startSignIn, isFetching, hasSession, lastError]
  );
}
