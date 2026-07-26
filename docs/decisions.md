# BotolaHub Architectural Decisions Log (ADR)

## ADR-001: Strict 1X2 Prediction Game Architecture (No Fantasy Mechanics)

- **Status:** Approved
- **Context:** BotolaHub is designed as a weekly 1X2 match outcome prediction game for Morocco's Botola Pro Inwi.
- **Decision:** Exclude all fantasy football mechanics (squad creation, player pricing, transfers, captains, formations, player-level scoring). Focus entirely on 1X2 outcome prediction (`1`, `X`, `2`).

## ADR-002: Monorepo Architecture with pnpm Workspaces & Turborepo

- **Status:** Approved
- **Context:** Shared code (contracts, API client, design tokens, localization, prediction engine, database schemas) must be reused seamlessly across web, admin, mobile, API, and worker apps.
- **Decision:** Use pnpm workspaces and Turborepo with strict TypeScript packages.

## ADR-003: NestJS + Fastify for API Server

- **Status:** Approved
- **Context:** High throughput REST API required with OpenAPI schema generation.
- **Decision:** Build API using NestJS with Fastify HTTP adapter.

## ADR-004: Pure Functions for Prediction & Scoring Engine

- **Status:** Approved
- **Context:** Scoring and ranking rules must be 100% deterministic, testable, and idempotent.
- **Decision:** Encapsulate all prediction calculations in `@botolahub/prediction-engine` as pure functions.
