# BotolaHub — Morocco's Botola Pro Inwi Prediction Game

BotolaHub is a weekly football prediction platform focused exclusively on Morocco's **Botola Pro Inwi**. 

Players predict the 1X2 match outcomes (Home Win `1`, Draw `X`, Away Win `2`) for every scheduled match in a gameweek to compete in weekly and season-long global and private leaderboards.

> ⚠️ **Note:** BotolaHub is a match prediction game, **not** a fantasy football platform. There are no player prices, transfers, squad budgets, formations, or player-level fantasy statistics.

---

## ⚽ Product Overview

- **Match Outcome Predictions (1X2):** Predict Home Win (`1`), Draw (`X`), or Away Win (`2`) for every fixture in an active gameweek.
- **Strict Lock Times:** Every gameweek locks automatically **1 hour before** its earliest scheduled kickoff. Predictions become immutable at lock.
- **Favorite Club Bonus:** Choose your favorite Botola Pro club during onboarding. Matches involving your favorite team feature enhanced risk/reward scoring.
- **Global & Private Competitions:** Compete on global weekly and season leaderboards, or create/join private mini-leagues with friends via invitation links.
- **Multilingual & Full RTL Support:** Native support for Arabic (RTL), French, and English across web and mobile interfaces.
- **News & Community Feed:** In-app updates, scoring explanations, editorial articles, and gameweek notifications.
- **Role-Protected Administration:** Dedicated web portal for competition setup, fixture imports, result confirmation, score previews, idempotent settlement, and audit logging.

---

## 🎯 Authoritative Scoring & Ranking Rules

### Scoring Matrix

Points are calculated using pure deterministic functions based on an immutable snapshot taken at deadline lock:

| Match Category | Correct Prediction | Wrong Prediction | Missing Prediction at Lock |
| :--- | :---: | :---: | :---: |
| **Standard Match** | `+3 pts` | `-1 pt` | `-1 pt` |
| **Favorite Club Match** | `+4 pts` | `-2 pts` | `-2 pts` |

- **Favorite Club Snapshot:** The multiplier is based on the favorite club recorded in the user's gameweek snapshot at lock time. Subsequent profile changes do not alter past settled scores.
- **Idempotency:** Settlement re-runs with unchanged inputs produce identical point totals and audit records without duplication.

### Deterministic Leaderboard Tie-Breakers

When two or more players share the same point total, rank order is strictly determined by:

1. **Total Points** *(Descending)*
2. **Number of Correct Predictions** *(Descending)*
3. **Number of Correct Favorite-Team Predictions** *(Descending)*
4. **Number of Submitted Predictions** *(Descending)*
5. **Account Creation Timestamp** *(Ascending)*
6. **User ID** *(Ascending stable tie-breaker)*

---

## 🛠️ Technical Architecture

BotolaHub is structured as a TypeScript monorepo using **pnpm workspaces** and **Turborepo**.

```text
BotolaHub/
├── apps/
│   ├── api/          # NestJS (Fastify) REST API (/api/v1) & OpenAPI
│   ├── web/          # Next.js App Router responsive web user application
│   ├── mobile/       # Expo React Native app (iOS & Android)
│   ├── admin/        # Next.js App Router role-protected administration web app
│   └── workers/      # Redis & BullMQ background processing workers
├── packages/
│   ├── api-client/   # Auto-generated typed API client SDK
│   ├── config/       # Shared ESLint, TypeScript, and Prettier configurations
│   ├── contracts/    # Shared Zod validation schemas and DTOs
│   ├── database/     # Prisma ORM schemas, migrations, and seed scripts
│   ├── design-tokens/# Shared color tokens, typography, and UI spacing rules
│   ├── localization/ # i18n translation strings (AR, FR, EN) and RTL helpers
│   ├── prediction-engine/ # Pure deterministic scoring and ranking functions
│   └── test-utils/   # Shared test fixtures and mocks
├── infrastructure/   # Docker Compose setups (PostgreSQL, Redis)
├── docs/             # Product specifications, architecture guides, and audit logs
└── scripts/          # Workspace management scripts
```

### Technology Stack

- **Core Monorepo:** pnpm, Turborepo, TypeScript (Strict Mode)
- **Web Applications:** Next.js (App Router), Vanilla CSS / Custom Design Tokens
- **Mobile Application:** Expo, React Native, Expo Router
- **Backend API:** NestJS, Fastify, Zod Validation
- **Database & Persistence:** PostgreSQL, Prisma ORM
- **Cache & Async Queue:** Redis, BullMQ
- **Testing & E2E:** Vitest, Playwright E2E
- **Infrastructure:** Docker Compose, GitHub Actions CI

---

## 📅 7-Day Implementation Plan

| Day | Focus Area | Key Deliverables |
| :--- | :--- | :--- |
| **Day 1** | **Foundation & Monorepo Skeleton** | pnpm/Turborepo workspace, PostgreSQL/Redis Docker setup, health checks, localization shells (AR/FR/EN), and one-command launcher. |
| **Day 2** | **Identity, Onboarding & Admin Foundation** | Email/Password (Argon2id), Phone OTP, OAuth adapters (Google, Facebook, Apple), onboarding flow, favorite club selection, and admin authorization. |
| **Day 3** | **Gameweeks, Fixtures & Prediction Engine** | Admin fixture/gameweek management, 1-hour deadline lock logic, pure 1X2 prediction engine, and responsive prediction home screens. |
| **Day 4** | **Settlement, Global Rankings & Corrections** | Audited result entry, idempotent settlement pipeline, score explanation snapshots, deterministic leaderboards, and result correction recalculations. |
| **Day 5** | **Private Groups, Invitations & News** | Private mini-leagues (min 3 members), invite tokens (link/username/email), localized news authoring/feed, and in-app notifications. |
| **Day 6** | **Admin Tools, Security & QA** | Bulk fixture import, analytics summaries, audit logging, rate limiting, security headers, accessibility check, and Playwright E2E test suite. |
| **Day 7** | **Clean-Room Release Candidate** | Performance index tuning, production Docker packaging, Expo preview setup, disaster recovery docs, and `v0.1.0-rc.1` tagging. |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** `>= 20.x`
- **pnpm** `>= 9.x` (`corepack enable`)
- **Docker & Docker Compose** (for PostgreSQL and Redis)

### Installation & Local Environment Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/alaebouhmaladev/BotolaHub.git
   cd BotolaHub
   ```

2. **Install dependencies:**
   ```bash
   corepack pnpm install
   ```

3. **Configure Environment Variables:**
   Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

4. **Start Infrastructure Services:**
   ```bash
   docker compose -f infrastructure/docker-compose.yml up -d
   ```

5. **Run Database Migrations & Seeds:**
   ```bash
   corepack pnpm --filter @botolahub/database db:deploy
   corepack pnpm --filter @botolahub/database db:seed
   ```

6. **Launch All Applications:**
   ```bash
   corepack pnpm dev
   ```

---

## 🧪 Verification & Quality Control

Run the complete verification pipeline:

```bash
# Code formatting check
corepack pnpm format:check

# Static analysis and linting
corepack pnpm lint

# TypeScript compilation check
corepack pnpm typecheck

# Unit and integration test suites
corepack pnpm test

# Web End-to-End Playwright test suite
corepack pnpm --filter @botolahub/web test:e2e

# Build all applications and packages
corepack pnpm build
```

---

## 🔒 Security & Privacy

- **Data Privacy:** User PII (birth dates, full names, phone numbers, email addresses) is never exposed in public leaderboards. Public profiles display only verified usernames, display names, and approved avatars.
- **Audit Logging:** Every administrative action (lock overrides, result corrections, settlement triggers) requires identity verification, a request ID, and a mandatory audit reason log.
- **Immutable Scopes:** Gameweek deadlines and scoring logic are strictly validated server-side within PostgreSQL database transactions. Client-submitted score metadata or deadlines are never trusted.

---

## 📄 License

This repository is maintained as proprietary software. All rights reserved.
