import { HealthResponse, HealthResponseSchema } from "@botolahub/contracts";

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
}
