# BotolaHub — Morocco's Botola Pro Inwi Prediction Game

BotolaHub is a weekly football prediction platform focused exclusively on Morocco's **Botola Pro Inwi**.

Players predict 1X2 match outcomes (Home Win `1`, Draw `X`, Away Win `2`) for every scheduled match in a gameweek to compete in weekly and season-long global and private leaderboards.

> ⚠️ **Note:** BotolaHub is a match prediction game, **not** a fantasy football platform. There are no player prices, transfers, squad budgets, formations, or player-level fantasy statistics.

---

## ⚽ Product Overview

- **Match Outcome Predictions (1X2):** Predict Home Win (`1`), Draw (`X`), or Away Win (`2`) for every fixture in an active gameweek.
- **Strict Lock Times:** Every gameweek locks automatically **1 hour before** its earliest scheduled kickoff. Predictions become immutable at lock time.
- **Favorite Club Bonus:** Select your favorite Botola Pro club during onboarding to activate enhanced `+4/-2` risk/reward scoring on their matches.
- **Global & Private Mini-Leagues:** Compete on global weekly and season leaderboards, or create and join private groups with friends using expiring invitation links or username/email invites.
- **Transactional & In-App Notifications:** Automated reminders at 2 hours before lock, targeted incomplete-prediction alerts, lock notices, and settlement results with locale, timezone, and quiet-hour compliance.
- **Ethical Sponsorship System:** Administrator-managed sponsor campaigns, feature-flagged and disabled by default. Clearly labeled, non-intrusive placements with zero PII tracking or prediction flow disruption.
- **Multilingual & Full RTL Support:** Native support for Arabic (RTL), French, and English across web and mobile applications.
- **Role-Protected Administration:** Separate admin web app for fixture management, result confirmation, score previews, idempotent settlement, news/announcement publishing, and audit history.

---

## 🎯 Authoritative Rules & Mechanics

### Scoring Matrix

Points are calculated using pure deterministic functions based on an immutable snapshot taken at deadline lock:

| Match Category          | Correct Prediction | Wrong Prediction | Missing Prediction at Lock |
| :---------------------- | :----------------: | :--------------: | :------------------------: |
| **Standard Match**      |      `+3 pts`      |     `-1 pt`      |          `-1 pt`           |
| **Favorite Club Match** |      `+4 pts`      |     `-2 pts`     |          `-2 pts`          |

- **Favorite Club Snapshot:** The multiplier is based on the favorite club recorded in the user's gameweek snapshot at lock time. Subsequent profile changes do not alter past settled scores.
- **Idempotency:** Settlement re-runs with unchanged inputs produce identical point totals and audit records without duplication.

### Notification Timing Rules

- **Gameweek Open:** Sent when a published gameweek opens for predictions.
- **2-Hour Pre-Lock Reminder:** Main deadline reminder sent exactly 2 hours before prediction lock (typically 3 hours before earliest kickoff).
- **Targeted Incomplete Reminder:** Sent only to users with unsubmitted predictions prior to lock.
- **Lock Notice:** Sent when the prediction window closes.
- **Settlement & Ranking Notice:** Sent when match results are confirmed and rankings are calculated.
- **Dynamic Rescheduling:** Scheduled notification jobs automatically recalculate if fixture kickoff times move before lock.

### Deterministic Leaderboard Tie-Breakers

When two or more players share the same point total, rank order is strictly determined by:

1. **Total Points** _(Descending)_
2. **Number of Correct Predictions** _(Descending)_
3. **Number of Correct Favorite-Team Predictions** _(Descending)_
4. **Number of Submitted Predictions** _(Descending)_
5. **Account Creation Timestamp** _(Ascending)_
6. **User ID** _(Ascending stable tie-breaker)_

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

### Core Domain Data Models

- **Identity & Profiles:** `User`, `UserIdentity`, `UserSession`, `UserProfile`, `UserFavoriteClubHistory`, `OAuthAccount`, `PhoneVerificationChallenge`
- **Football & Competition:** `Competition`, `Season`, `Club`, `Gameweek`, `Fixture`
- **Engine & Leaderboards:** `Prediction`, `PredictionScore`, `GameweekUserScore`, `SeasonUserScore`, `ScoringRuleSet`, `SettlementRun`, `RankingSnapshot`
- **Social & Content:** `PrivateGroup`, `PrivateGroupMember`, `PrivateGroupInvitation`, `NewsArticle`, `NewsArticleTranslation`, `NewsCategory`
- **Messaging & Notifications:** `Notification`, `NotificationPreference`, `DevicePushToken`, `NotificationEvent`, `NotificationDelivery`
- **Sponsorship & Monetization:** `Sponsor`, `SponsorCampaign`, `SponsorCreative`, `SponsorPlacement`, `SponsorImpression`, `SponsorClick`
- **Governance:** `AdminAuditLog`

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

## 📅 8-Day Implementation Plan

| Day       | Focus Area                           | Key Deliverables                                                                                                                                            |
| :-------- | :----------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Day 1** | **Foundation & Skeleton**            | pnpm/Turborepo monorepo, PostgreSQL/Redis Docker setups, health checks, AR/FR/EN localization shells, and one-command launcher.                             |
| **Day 2** | **Identity & Profile Onboarding**    | Email/Password (Argon2id), Phone OTP, OAuth adapters (Google, Facebook, Apple), mandatory onboarding, favorite club selection, and admin security base.     |
| **Day 3** | **Gameweeks & Prediction Engine**    | Admin fixture/gameweek management, 1-hour deadline lock logic, pure 1X2 prediction engine, and responsive prediction home screens.                          |
| **Day 4** | **Settlement & Global Rankings**     | Audited result entry, idempotent settlement pipeline, score explanation snapshots, deterministic global leaderboards, and result correction recalculations. |
| **Day 5** | **Private Groups & News Feed**       | Multi-group private mini-leagues (min 3 members), expiring invite tokens, group rankings, and localized admin-published news articles.                      |
| **Day 6** | **Push Notifications & Sponsorship** | Device token management, 2-hour pre-lock reminders, incomplete prediction targeting, in-app notification inbox, and feature-flagged sponsor ad system.      |
| **Day 7** | **Admin Tools, Security & QA**       | Bulk fixture import, analytics summaries, audit logging, rate limiting, security headers, accessibility audit, and Playwright E2E suite.                    |
| **Day 8** | **Clean-Room Release Candidate**     | Database index optimization, production Docker packaging, Expo preview setup, recovery documentation, full verification, and `v0.1.0-rc.1` tagging.         |

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

## 🔒 Security, Privacy & Sponsorship Rules

- **Data Privacy:** User PII (birth dates, full names, phone numbers, email addresses) is never exposed in public leaderboards. Public profiles display only verified usernames, display names, and approved avatars.
- **Ethical Sponsorship Framework:**
  - Sponsor ads remain **disabled by default** behind a global kill switch feature flag.
  - Placements are strictly labeled as **"Sponsored"** and never disguise as fixtures, predictions, or ranking entries.
  - Advertisements are completely excluded from prediction submission controls and flow.
  - Zero PII, location data, or prediction choices are transmitted to sponsors.
- **Audit Logging:** Every administrative action (lock overrides, result corrections, settlement triggers, sponsor campaign modifications) requires identity verification, a request ID, and a mandatory audit reason log.
- **Server Authority:** Gameweek deadlines and scoring logic are strictly validated server-side within PostgreSQL database transactions. Client-submitted score metadata or deadlines are never trusted.

---

## 📄 License

This repository is maintained as proprietary software. All rights reserved.
