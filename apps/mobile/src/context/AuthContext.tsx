import React, { createContext, useContext, useState, useEffect } from "react";
import { BotolaHubApiClient } from "@botolahub/api-client";
import { User } from "@botolahub/contracts";
import {
  getSecureItem,
  saveSecureItem,
  deleteSecureItem,
} from "../services/secureStore";

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (
    accessToken: string,
    refreshToken: string,
    user: User,
  ) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_URL =
  process.env.EXPO_PUBLIC_API_URL || "http://localhost:3001/api/v1";

const REFRESH_TOKEN_KEY = "botolahub_mobile_refresh_token";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const client = new BotolaHubApiClient({ baseUrl: API_URL });

  useEffect(() => {
    async function restoreMobileSession() {
      try {
        const savedRefreshToken = await getSecureItem(REFRESH_TOKEN_KEY);
        if (savedRefreshToken) {
          const res = await client.mobileRefresh(savedRefreshToken);
          if (res.refreshToken) {
            await saveSecureItem(REFRESH_TOKEN_KEY, res.refreshToken);
          }
          setToken(res.accessToken);
          setUser(res.user);
        }
      } catch {
        await deleteSecureItem(REFRESH_TOKEN_KEY);
        setToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    }
    restoreMobileSession();
  }, []);

  const login = async (
    accessToken: string,
    refreshToken: string,
    newUser: User,
  ) => {
    setToken(accessToken);
    setUser(newUser);
    if (refreshToken) {
      await saveSecureItem(REFRESH_TOKEN_KEY, refreshToken);
    }
  };

  const logout = async () => {
    try {
      const savedRefreshToken = await getSecureItem(REFRESH_TOKEN_KEY);
      if (savedRefreshToken) {
        await client.mobileLogout(savedRefreshToken);
      }
    } catch {
      // network failure fallback
    }
    setToken(null);
    setUser(null);
    await deleteSecureItem(REFRESH_TOKEN_KEY);
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
