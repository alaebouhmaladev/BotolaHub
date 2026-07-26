# BotolaHub Repository Map

```text
BotolaHub/
├── apps/
│   ├── admin/             # Next.js Admin Web Shell (Port 3002)
│   ├── api/               # NestJS Fastify API (Port 3000)
│   ├── mobile/            # Expo React Native App (Port 8081)
│   ├── web/               # Next.js User Web App (Port 3001)
│   └── workers/           # BullMQ Background Worker Service
├── packages/
│   ├── api-client/        # Typed API SDK Client
│   ├── config/            # Shared Environment & TS Configs
│   ├── contracts/         # Zod Health & API Schemas
│   ├── database/          # Prisma ORM & Readiness Helper
│   ├── design-tokens/     # Colors, Typography, Spacing Tokens
│   ├── localization/      # AR / FR / EN Dictionaries & RTL Helper
│   ├── prediction-engine/ # Pure 1X2 Prediction Engine Foundation
│   └── test-utils/        # Shared Testing Fixtures
├── infrastructure/        # Docker Compose (PostgreSQL, Redis)
├── docs/                  # Architecture & Audit Documentation
├── scripts/               # Launcher Scripts (pnpm botolahub)
├── pnpm-workspace.yaml    # Monorepo Package Manager Config
├── turbo.json             # Turborepo Build & Pipeline Config
└── package.json           # Monorepo Root Script Definitions
```
