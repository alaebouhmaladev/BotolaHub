# BotolaHub Architecture Overview

## Product Definition

BotolaHub is an original weekly football prediction platform focused exclusively on Morocco's **Botola Pro Inwi**.
Users predict match outcomes (Home Win `1`, Draw `X`, Away Win `2`) for every scheduled fixture in a gameweek.

> ⚠️ BotolaHub is **NOT** a fantasy football platform. There are no fantasy squads, player prices, formations, captains, transfers, player fantasy scoring, or fantasy leagues.

## Monorepo Architecture

BotolaHub uses a **pnpm workspaces** + **Turborepo** monorepo structure.

### Applications (`apps/`)

- `api`: NestJS Fastify REST API server (`/api/v1`) with OpenAPI Swagger documentation.
- `web`: Next.js (App Router) responsive user application.
- `admin`: Next.js (App Router) role-protected administration web application.
- `mobile`: Expo React Native app (iOS & Android) with Expo Router.
- `workers`: Node.js BullMQ worker process for background job processing.

### Shared Packages (`packages/`)

- `config`: Environment validation (Zod) and shared TypeScript configs.
- `contracts`: Health and API data schemas.
- `api-client`: Typed API SDK for client apps.
- `database`: Prisma ORM client and database migration management.
- `design-tokens`: BotolaHub design tokens (colors, typography, spacing, touch targets).
- `localization`: English, French, and Arabic dictionaries with RTL helpers.
- `prediction-engine`: Pure deterministic 1X2 scoring and ranking engine (foundation).
- `test-utils`: Shared testing utilities and mocks.

## Infrastructure & Persistence

- **Database:** PostgreSQL 16 (persisted via Docker named volume `botolahub_postgres_data`).
- **Cache & Queue:** Redis 7 (persisted via Docker named volume `botolahub_redis_data`).
