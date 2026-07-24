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
  Competition,
  CompetitionSchema,
  Season,
  SeasonSchema,
  Club,
  ClubSchema,
  PlayerSeason,
  PlayerSeasonSchema,
  Gameweek,
  GameweekSchema,
  Fixture,
  FixtureSchema,
  PlayerFilterQuery,
  createPaginatedResponseSchema,
  FantasyTeam,
  FantasyTeamSchema,
  CreateFantasyTeamDto,
  UpdateSquadDto,
  UpdateLineupDto,
} from "@botolahub/contracts";
import { z } from "zod";

export interface ApiClientConfig {
  baseUrl: string;
  fetch?: typeof fetch;
}

const PaginatedPlayersSchema =
  createPaginatedResponseSchema(PlayerSeasonSchema);

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

  // ─── Catalog APIs ────────────────────────────────────────────────────────

  async getActiveCompetition(): Promise<Competition> {
    const res = await this.customFetch(`${this.baseUrl}/competitions/active`);
    const body = await res.json();
    if (!res.ok)
      throw new Error(body.error?.message || "Failed to fetch competition");
    return CompetitionSchema.parse(body.data);
  }

  async getActiveSeason(): Promise<Season> {
    const res = await this.customFetch(`${this.baseUrl}/seasons/active`);
    const body = await res.json();
    if (!res.ok)
      throw new Error(body.error?.message || "Failed to fetch season");
    return SeasonSchema.parse(body.data);
  }

  async getClubs(): Promise<Club[]> {
    const res = await this.customFetch(`${this.baseUrl}/clubs`);
    const body = await res.json();
    if (!res.ok)
      throw new Error(body.error?.message || "Failed to fetch clubs");
    return z.array(ClubSchema).parse(body.data);
  }

  async getClub(id: string): Promise<Club> {
    const res = await this.customFetch(`${this.baseUrl}/clubs/${id}`);
    const body = await res.json();
    if (!res.ok) throw new Error(body.error?.message || "Failed to fetch club");
    return ClubSchema.parse(body.data);
  }

  async getPlayers(query?: PlayerFilterQuery): Promise<{
    items: PlayerSeason[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const params = new URLSearchParams();
    if (query?.search) params.append("search", query.search);
    if (query?.clubId) params.append("clubId", query.clubId);
    if (query?.position) params.append("position", query.position);
    if (query?.minPrice !== undefined)
      params.append("minPrice", query.minPrice.toString());
    if (query?.maxPrice !== undefined)
      params.append("maxPrice", query.maxPrice.toString());
    if (query?.status) params.append("status", query.status);
    if (query?.page) params.append("page", query.page.toString());
    if (query?.limit) params.append("limit", query.limit.toString());

    const queryString = params.toString() ? `?${params.toString()}` : "";
    const res = await this.customFetch(`${this.baseUrl}/players${queryString}`);
    const body = await res.json();
    if (!res.ok)
      throw new Error(body.error?.message || "Failed to fetch players");
    return PaginatedPlayersSchema.parse(body.data);
  }

  async getPlayer(id: string): Promise<PlayerSeason> {
    const res = await this.customFetch(`${this.baseUrl}/players/${id}`);
    const body = await res.json();
    if (!res.ok)
      throw new Error(body.error?.message || "Failed to fetch player");
    return PlayerSeasonSchema.parse(body.data);
  }

  async getGameweeks(): Promise<Gameweek[]> {
    const res = await this.customFetch(`${this.baseUrl}/gameweeks`);
    const body = await res.json();
    if (!res.ok)
      throw new Error(body.error?.message || "Failed to fetch gameweeks");
    return z.array(GameweekSchema).parse(body.data);
  }

  async getActiveGameweek(): Promise<Gameweek> {
    const res = await this.customFetch(`${this.baseUrl}/gameweeks/active`);
    const body = await res.json();
    if (!res.ok)
      throw new Error(body.error?.message || "Failed to fetch active gameweek");
    return GameweekSchema.parse(body.data);
  }

  async getFixtures(): Promise<Fixture[]> {
    const res = await this.customFetch(`${this.baseUrl}/fixtures`);
    const body = await res.json();
    if (!res.ok)
      throw new Error(body.error?.message || "Failed to fetch fixtures");
    return z.array(FixtureSchema).parse(body.data);
  }

  // ─── Fantasy Team APIs ───────────────────────────────────────────────────

  async createFantasyTeam(
    dto: CreateFantasyTeamDto,
    token?: string,
  ): Promise<FantasyTeam> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await this.customFetch(`${this.baseUrl}/fantasy-teams`, {
      method: "POST",
      headers,
      body: JSON.stringify(dto),
      credentials: "include",
    });
    const body = await res.json();
    if (!res.ok)
      throw new Error(body.error?.message || "Failed to create fantasy team");
    return FantasyTeamSchema.parse(body.data);
  }

  async getMyFantasyTeam(token?: string): Promise<FantasyTeam | null> {
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await this.customFetch(`${this.baseUrl}/fantasy-teams/me`, {
      method: "GET",
      headers,
      credentials: "include",
    });
    const body = await res.json();
    if (res.status === 404) return null;
    if (!res.ok)
      throw new Error(body.error?.message || "Failed to fetch fantasy team");
    return FantasyTeamSchema.parse(body.data);
  }

  async getFantasyTeam(id: string, token?: string): Promise<FantasyTeam> {
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await this.customFetch(`${this.baseUrl}/fantasy-teams/${id}`, {
      method: "GET",
      headers,
      credentials: "include",
    });
    const body = await res.json();
    if (!res.ok)
      throw new Error(body.error?.message || "Failed to fetch fantasy team");
    return FantasyTeamSchema.parse(body.data);
  }

  async updateSquad(
    id: string,
    dto: UpdateSquadDto,
    token?: string,
  ): Promise<FantasyTeam> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await this.customFetch(
      `${this.baseUrl}/fantasy-teams/${id}/squad`,
      {
        method: "PUT",
        headers,
        body: JSON.stringify(dto),
        credentials: "include",
      },
    );
    const body = await res.json();
    if (!res.ok) {
      const err = new Error(body.error?.message || "Failed to update squad");
      (err as Error & { details?: unknown }).details = body.error?.details;
      throw err;
    }
    return FantasyTeamSchema.parse(body.data);
  }

  async updateLineup(
    id: string,
    dto: UpdateLineupDto,
    token?: string,
  ): Promise<FantasyTeam> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await this.customFetch(
      `${this.baseUrl}/fantasy-teams/${id}/lineup`,
      {
        method: "PUT",
        headers,
        body: JSON.stringify(dto),
        credentials: "include",
      },
    );
    const body = await res.json();
    if (!res.ok) {
      const err = new Error(body.error?.message || "Failed to update lineup");
      (err as Error & { details?: unknown }).details = body.error?.details;
      throw err;
    }
    return FantasyTeamSchema.parse(body.data);
  }
}
