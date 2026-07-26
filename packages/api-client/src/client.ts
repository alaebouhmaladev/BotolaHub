import {
  HealthCheckResponse,
  HealthCheckResponseSchema,
  ReadinessCheckResponse,
  ReadinessCheckResponseSchema,
} from '@botolahub/contracts';

export interface ApiClientConfig {
  baseUrl: string;
  fetchFn?: typeof fetch;
}

export class BotolaHubApiClient {
  private baseUrl: string;
  private fetchFn: typeof fetch;

  constructor(config: ApiClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.fetchFn = config.fetchFn || globalThis.fetch;
  }

  async getHealth(): Promise<HealthCheckResponse> {
    const res = await this.fetchFn(`${this.baseUrl}/api/v1/health`);
    if (!res.ok) {
      throw new Error(`Health check failed with status ${res.status}`);
    }
    const data = await res.json();
    return HealthCheckResponseSchema.parse(data);
  }

  async getLiveness(): Promise<HealthCheckResponse> {
    const res = await this.fetchFn(`${this.baseUrl}/api/v1/health/live`);
    if (!res.ok) {
      throw new Error(`Liveness check failed with status ${res.status}`);
    }
    const data = await res.json();
    return HealthCheckResponseSchema.parse(data);
  }

  async getReadiness(): Promise<ReadinessCheckResponse> {
    const res = await this.fetchFn(`${this.baseUrl}/api/v1/health/ready`);
    if (!res.ok) {
      throw new Error(`Readiness check failed with status ${res.status}`);
    }
    const data = await res.json();
    return ReadinessCheckResponseSchema.parse(data);
  }
}
