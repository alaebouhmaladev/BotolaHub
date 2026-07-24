"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
} from "react";
import { BotolaHubApiClient } from "@botolahub/api-client";
import { User } from "@botolahub/contracts";

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (token: string, user: User) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== "undefined"
    ? `${window.location.origin}/api/v1`
    : "http://localhost:3001/api/v1");

// Stable API client instance created once outside component render tree
export const webClient = new BotolaHubApiClient({ baseUrl: API_URL });

let refreshPromise: ReturnType<typeof webClient.refresh> | null = null;

export function refreshSessionOnce() {
  if (!refreshPromise) {
    refreshPromise = webClient.refresh().finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
}

export function AuthProvider({
  children,
}: {
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  children: any;
}): JSX.Element | null {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Ref to track active restoration state and avoid stale state updates
  const activeRestorationRef = useRef(true);

  useEffect(() => {
    let cancelled = false;

    refreshSessionOnce()
      .then((res) => {
        if (!cancelled && activeRestorationRef.current) {
          webClient.setAccessToken(res.accessToken);
          setToken(res.accessToken);
          setUser(res.user);
        }
      })
      .catch(() => {
        if (!cancelled && activeRestorationRef.current) {
          webClient.setAccessToken(null);
          setUser(null);
          setToken(null);
        }
      })
      .finally(() => {
        if (!cancelled && activeRestorationRef.current) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const login = (newToken: string, newUser: User) => {
    activeRestorationRef.current = true;
    setToken(newToken);
    setUser(newUser);
  };

  const logout = async () => {
    // Invalidate any in-flight or pending session restoration
    activeRestorationRef.current = false;
    setToken(null);
    setUser(null);

    try {
      await webClient.logout();
    } catch {
      // ignore network error on logout
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
