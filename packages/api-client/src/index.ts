import {
  HealthResponse,
  HealthResponseSchema,
  RegisterDtoType,
  LoginDtoType,
  User,
  UserSchema,
  WebAuthSuccessData,
  WebAuthSuccessDataSchema,
  MobileAuthSuccessData,
  MobileAuthSuccessDataSchema,
} from "@botolahub/contracts";

export interface ApiClientConfig {
  baseUrl: string;
  fetch?: typeof fetch;
}

export class BotolaHubApiClient {
  private baseUrl: string;
  private customFetch: typeof fetch;

  constructor(config: ApiClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, "");
    this.customFetch = config.fetch || globalThis.fetch;
  }

  async getHealth(): Promise<HealthResponse> {
    const res = await this.customFetch(`${this.baseUrl}/health`);
    if (!res.ok) {
      throw new Error(`Health check failed with status ${res.status}`);
    }
    const data = await res.json();
    return HealthResponseSchema.parse(data);
  }

  async register(dto: RegisterDtoType): Promise<{ user: User }> {
    const res = await this.customFetch(`${this.baseUrl}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dto),
    });
    const body = await res.json();
    if (!res.ok) {
      throw new Error(body.error?.message || "Registration failed");
    }
    const validatedUser = UserSchema.parse(body.data.user);
    return { user: validatedUser };
  }

  // ─── Web Authentication Methods ──────────────────────────────────────────

  async login(dto: LoginDtoType): Promise<WebAuthSuccessData> {
    const res = await this.customFetch(`${this.baseUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dto),
      credentials: "include",
    });
    const body = await res.json();
    if (!res.ok) {
      throw new Error(body.error?.message || "Login failed");
    }
    return WebAuthSuccessDataSchema.parse(body.data);
  }

  async refresh(): Promise<WebAuthSuccessData> {
    const res = await this.customFetch(`${this.baseUrl}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });
    const body = await res.json();
    if (!res.ok) {
      throw new Error(body.error?.message || "Token refresh failed");
    }
    return WebAuthSuccessDataSchema.parse(body.data);
  }

  async logout(): Promise<void> {
    await this.customFetch(`${this.baseUrl}/auth/logout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });
  }

  // ─── Mobile Authentication Methods ───────────────────────────────────────

  async mobileLogin(dto: LoginDtoType): Promise<MobileAuthSuccessData> {
    const res = await this.customFetch(`${this.baseUrl}/auth/mobile/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dto),
    });
    const body = await res.json();
    if (!res.ok) {
      throw new Error(body.error?.message || "Mobile login failed");
    }
    return MobileAuthSuccessDataSchema.parse(body.data);
  }

  async mobileRefresh(refreshToken: string): Promise<MobileAuthSuccessData> {
    const res = await this.customFetch(`${this.baseUrl}/auth/mobile/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    const body = await res.json();
    if (!res.ok) {
      throw new Error(body.error?.message || "Mobile token refresh failed");
    }
    return MobileAuthSuccessDataSchema.parse(body.data);
  }

  async mobileLogout(refreshToken: string): Promise<void> {
    await this.customFetch(`${this.baseUrl}/auth/mobile/logout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
  }

  // ─── Authenticated User Profile ──────────────────────────────────────────

  async getCurrentUser(token: string): Promise<{ user: User }> {
    const res = await this.customFetch(`${this.baseUrl}/auth/me`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      credentials: "include",
    });
    const body = await res.json();
    if (!res.ok) {
      throw new Error(body.error?.message || "Failed to fetch user");
    }
    const validatedUser = UserSchema.parse(body.data.user);
    return { user: validatedUser };
  }
}
