# BotolaHub 🇲🇦 ⚽

BotolaHub is an original fantasy-football platform designed for Morocco’s Botola Pro, featuring a responsive web application, mobile apps for iOS and Android, NestJS API, background workers, PostgreSQL database, Redis cache/job queues, pure deterministic fantasy engine, and multilingual support (Arabic, French, and English with native RTL layout support).

---

## Technical Stack

- **Monorepo**: pnpm workspaces + Turborepo
- **Language**: TypeScript (Strict mode enabled across all packages)
- **Web App**: Next.js 14 App Router
- **Admin App**: Next.js 14 App Router
- **Mobile App**: Expo React Native + Expo Router
- **API Server**: NestJS with Fastify adapter (`/api/v1`)
- **Database**: PostgreSQL 16 & Prisma ORM
- **Cache & Jobs**: Redis 7 & BullMQ
- **Validation**: Zod
- **Testing**: Vitest
- **Local Infrastructure**: Docker Compose
- **Continuous Integration**: GitHub Actions

---

## Onboarding & Getting Started Guide

### 1. Prerequisites

Ensure you have installed:

- Node.js >= 20.0.0
- pnpm >= 9.0.0 (`npm i -g pnpm`)
- Docker & Docker Compose

### 2. Environment Setup

Copy the environment template:

```bash
cp .env.example .env
```

### 3. Install Dependencies

Install workspace dependencies from the root:

```bash
pnpm install
```

### 4. Start Local Infrastructure

Start PostgreSQL 16 and Redis 7 containers:

```bash
pnpm docker:up
```

Verify container status:

```bash
docker compose -f infrastructure/docker-compose.yml ps
```

### 5. Generate Prisma Client & Database Setup

Generate the Prisma client:

```bash
pnpm db:generate
```

Verify database connection:

```bash
pnpm db:check
```

Push database schema (when local DB is active):

```bash
pnpm db:push
```

### 6. Start Applications in Development Mode

Run all applications concurrently:

```bash
pnpm dev
```

Or launch applications individually:

| Application    | Startup Command                        | Local URL                      |
| :------------- | :------------------------------------- | :----------------------------- |
| **API Server** | `pnpm --filter @botolahub/api dev`     | `http://localhost:3001/api/v1` |
| **Web App**    | `pnpm --filter @botolahub/web dev`     | `http://localhost:3000`        |
| **Admin App**  | `pnpm --filter @botolahub/admin dev`   | `http://localhost:3002`        |
| **Mobile App** | `pnpm --filter @botolahub/mobile dev`  | Expo Metro Bundler             |
| **Workers**    | `pnpm --filter @botolahub/workers dev` | Process logs                   |

---

## Validation & Quality Assurance Commands

Run all verification checks across the monorepo:

```bash
# Code formatting check
pnpm format:check

# ESLint check
pnpm lint

# TypeScript strict typecheck
pnpm typecheck

# Unit and integration tests
pnpm test

# Build all apps and packages
pnpm build
```

---

## Health Check Endpoint

When the API server is running, query the health endpoint:

```bash
curl http://localhost:3001/api/v1/health
```

Expected response format:

```json
{
  "status": "ok",
  "timestamp": "2026-07-21T14:00:00.000Z",
  "version": "0.1.0",
  "services": {
    "database": "connected",
    "redis": "connected"
  }
}
```

---

## License

MIT License. See `LICENSE` for details.
