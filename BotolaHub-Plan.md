# BotolaHub — MVP Build Plan

## How to use this document

Start a new Gemini coding workspace with an empty repository. Give Gemini the **Master Prompt** once. At the beginning of each day, give it that day's prompt. Do not ask Gemini to implement future days early.

At the end of every task, Gemini must:

1. run formatting, linting, type checking, unit tests, and relevant end-to-end tests;
2. repair failures before continuing;
3. update `docs/progress.md` and `docs/decisions.md`;
4. commit the completed task with a descriptive Conventional Commit message;
5. stop and report changed files, commands run, test results, assumptions, and remaining risks.

## One-week MVP scope

The deliverable is a functional fantasy football MVP for Morocco's Botola Pro with:

- responsive web application;
- iOS and Android app from one Expo React Native codebase;
- Arabic, French, and English foundations, including RTL support;
- email/password authentication;
- Botola clubs, players, fixtures, and gameweeks;
- squad of 15 players with formation and budget validation;
- starting eleven, bench, captain, and vice-captain;
- transfer workflow;
- fixture/player-stat ingestion through a provider adapter;
- deterministic fantasy scoring;
- private leagues and join codes;
- global/private leaderboards;
- basic live-score refresh;
- small admin interface for data corrections;
- local Docker development and production-ready environment configuration.

The following are explicitly out of scope for this week:

- payments, subscriptions, advertisements, or prizes;
- social chat, news publishing, video, and advanced analytics;
- multiple competitions or historical seasons;
- complex automatic substitutions;
- fully optimized real-time infrastructure at massive scale;
- copying Tactix assets, source code, wording, layouts, or brand identity;
- scraping consumer football websites;
- production App Store/Play Store approval;
- production usage of club crests, player photographs, or league trademarks without permission.

## Master Prompt for Gemini

```text
You are the principal engineer responsible for building BotolaHub, an original fantasy-football product for Morocco's Botola Pro. It is inspired by the feature category of Tactix, but you must not copy Tactix branding, text, assets, source code, or distinctive visual design.

Your goal is to deliver a working MVP in seven development days. Work only on the task/day I give you. Do not silently expand the scope.

TECHNOLOGY DECISIONS
- Monorepo: pnpm workspaces + Turborepo
- Language: TypeScript with strict mode
- Web: Next.js App Router
- Mobile: Expo React Native + Expo Router
- API: NestJS using Fastify
- Database: PostgreSQL + Prisma
- Cache/jobs: Redis + BullMQ
- Validation/contracts: Zod
- API style: REST under /api/v1 with an OpenAPI document
- Testing: Vitest/Jest as appropriate; Playwright for web E2E
- Local infrastructure: Docker Compose
- CI: GitHub Actions

ARCHITECTURAL RULES
1. Begin as a modular monolith. Do not create microservices.
2. Web and mobile never call a football-data vendor directly.
3. Put football vendors behind a FootballDataProvider interface.
4. Put fantasy rules in packages/fantasy-engine as pure deterministic functions with no database access.
5. Version scoring and squad rules by season.
6. Keep provider IDs in ProviderEntityMapping; do not use provider IDs as domain primary keys.
7. Every fantasy score must persist an explainable points breakdown.
8. Treat all provider payloads as untrusted. Validate and normalize them.
9. Store all times in UTC and display them in the user's timezone.
10. Support ar, fr, and en. Arabic must support RTL from the start.
11. Never commit secrets. Maintain .env.example with documented variables.
12. Use original placeholder assets until licensing is confirmed.

REPOSITORY SHAPE
apps/web
apps/mobile
apps/api
apps/workers
apps/admin
packages/contracts
packages/api-client
packages/database
packages/fantasy-engine
packages/data-providers
packages/localization
packages/design-tokens
packages/config
packages/test-utils
infrastructure
docs

INITIAL MVP RULES
- One active Botola season with 16 configurable clubs.
- Squad: 15 players: 2 GK, 5 DEF, 5 MID, 3 FWD.
- Starting lineup: 11 players with exactly 1 GK, at least 3 DEF, at least 2 MID, and at least 1 FWD.
- Initial budget: 100.0 fantasy credits, stored as integer tenths to avoid floating-point errors.
- Maximum 3 players from the same club.
- Captain and vice-captain must be different starting players.
- Captain receives 2x points. Vice-captain receives 2x only if the captain has zero minutes.
- Unlimited transfers before the first deadline. During the MVP season, one free transfer per gameweek; additional transfers cost 4 points.
- Deadline is the first fixture kickoff of the gameweek.
- Rules are configuration, not scattered constants.

BASE SCORING RULES
- Played 1–59 minutes: +1
- Played 60+ minutes: +2
- Goal: GK/DEF +6, MID +5, FWD +4
- Assist: +3
- Clean sheet after 60+ minutes: GK/DEF +4, MID +1
- Every 3 saves by a GK: +1
- Penalty saved: +5
- Penalty missed: -2
- Yellow card: -1
- Red card: -3
- Own goal: -2
- Every 2 goals conceded after 60+ minutes: GK/DEF -1

ENGINEERING WORKFLOW
Before coding, inspect the repository and current docs. State the task plan briefly. Implement the smallest coherent vertical slice. Preserve existing working behavior. Do not replace working architecture without recording the reason in docs/decisions.md.

After each task:
- format;
- lint;
- typecheck;
- run unit and integration tests;
- run relevant E2E smoke tests;
- update docs/progress.md;
- report exact commands and outcomes;
- make one focused Conventional Commit.

If an external football API key is unavailable, do not block. Use a deterministic MockFootballDataProvider and fixtures stored in packages/data-providers/test-data. The real provider adapter may be added behind the same interface and disabled by environment configuration.

Do not claim completion unless acceptance criteria are verifiably satisfied.
```

## Day 1 — Foundation and executable skeleton

### Goal

Create a clean monorepo that boots locally and in CI.

### Tasks

#### 1.1 Repository bootstrap

- Initialize Git, pnpm workspaces, and Turborepo.
- Create all application/package directories from the master prompt.
- Add shared TypeScript, ESLint, Prettier, and environment configuration.
- Add root scripts: `dev`, `build`, `lint`, `typecheck`, `test`, and `test:e2e`.
- Add `.editorconfig`, `.gitignore`, `.env.example`, and root README.

Acceptance criteria:

- `pnpm install` succeeds from a clean checkout.
- `pnpm build`, `pnpm lint`, `pnpm typecheck`, and `pnpm test` succeed.
- No package uses an implicit `any` escape to bypass errors.

#### 1.2 Local infrastructure

- Add Docker Compose for PostgreSQL and Redis.
- Add health checks and named volumes.
- Create Prisma package and initial connection test.
- Document startup and reset commands.

Acceptance criteria:

- `docker compose up -d` starts healthy PostgreSQL and Redis containers.
- The API can connect to both dependencies.

#### 1.3 Application shells

- Create minimal Next.js web and admin applications.
- Create Expo mobile application with Expo Router.
- Create NestJS/Fastify API with `/api/v1/health`.
- Create worker process with a health/startup log.
- Add shared design tokens and localization packages.

Acceptance criteria:

- Web, admin, API, workers, and Expo dev server can start.
- Health endpoint checks API, database, and Redis.
- Web and mobile display an original BotolaHub welcome screen in all three languages.
- Switching to Arabic changes layout direction to RTL.

#### 1.4 CI

- Add GitHub Actions for install, lint, typecheck, unit tests, and builds.
- Cache pnpm dependencies.

### End-of-day demonstration

Show web, mobile, admin, API health response, successful root validation commands, and the final repository tree.

### Day 1 prompt

```text
Execute Day 1 of the BotolaHub plan: foundation and executable skeleton. Complete tasks 1.1 through 1.4 sequentially, validating and committing each coherent part. Do not implement fantasy features yet. End with the demonstration checklist and a concise risk report.
```

## Day 2 — Domain model, authentication, and seed data

### Goal

Create the database foundation and allow users to register and sign in.

### Tasks

#### 2.1 Prisma domain model

Implement:

- User, UserSession, Season, Competition, Club, Player, PlayerSeason;
- Gameweek, Fixture, FixtureEvent, PlayerFixtureStats;
- FantasyTeam, FantasySquadMember, GameweekLineup, GameweekLineupPlayer;
- Transfer, FantasyPlayerScore, FantasyTeamGameweekScore;
- FantasyLeague, FantasyLeagueMember, LeaderboardEntry;
- ProviderEntityMapping, IngestionRun, ScoringRuleSet, ScoringAdjustment, AuditLog.

Use UUIDs, timestamps, appropriate unique constraints, indexes, enums, and foreign keys. Add the first migration and an ER diagram in `docs/architecture/data-model.md`.

#### 2.2 Authentication

- Implement email/password registration and login.
- Hash passwords with Argon2id.
- Use short-lived access tokens and rotating refresh tokens.
- Store hashed refresh tokens, never raw tokens.
- Add logout, current-user, and refresh endpoints.
- Add rate limiting and generic authentication error responses.
- Use secure HTTP-only cookies on web; use secure storage on mobile.

#### 2.3 API conventions

- Standardize validation errors, pagination, error envelopes, request IDs, and OpenAPI.
- Generate or implement the shared typed API client.
- Add API integration tests for authentication and error cases.

#### 2.4 Deterministic seed data

- Create one mock season, 16 original placeholder clubs, at least 240 players, 30 gameweeks, and representative fixtures.
- Do not use real crests or player images.
- Ensure required position counts and realistic integer-tenth prices.
- Make seeding idempotent.

#### 2.5 Client authentication

- Implement login, registration, logout, persisted session, protected navigation, and language selection on web/mobile.

### Acceptance criteria

- A clean database can migrate and seed successfully.
- Registration/login/refresh/logout work on web and mobile.
- Protected endpoints reject invalid or expired sessions.
- OpenAPI and ER diagram exist.
- Seed command produces the same logical dataset on repeated runs.

### Day 2 prompt

```text
Execute Day 2: domain model, secure authentication, API conventions, deterministic Botola-shaped seed data, and web/mobile authentication. Use original placeholder team/player content. Finish all acceptance criteria and report migration, seed, integration-test, and client smoke-test results.
```

## Day 3 — Fantasy engine and squad builder

### Goal

Deliver the central playable feature: selecting and saving a legal fantasy squad.

### Tasks

#### 3.1 Pure fantasy engine

In `packages/fantasy-engine`, implement and thoroughly test:

- `validateSquad`;
- `validateStartingLineup`;
- `validateCaptaincy`;
- `calculatePlayerScore`;
- `calculateTeamGameweekScore`;
- transfer cost calculation;
- deadline and locking rules.

Use property/parameterized tests for boundaries: budget equality, club maximum, position counts, duplicate players, invalid formations, captain fallback, minutes at 0/1/59/60, clean sheets, cards, and goal-conceded deductions.

#### 3.2 Catalog APIs

- List competitions, season, clubs, players, fixtures, and gameweeks.
- Add player filtering by club, position, price, status, and search term.
- Add pagination and deterministic sorting.

#### 3.3 Fantasy team APIs

- Create fantasy team.
- Select/replace the 15-player squad.
- Save starting eleven, ordered bench, captain, and vice-captain.
- Validate again inside a database transaction on the server.
- Prevent writes after deadline.
- Return actionable validation errors.

#### 3.4 Web squad builder

- Responsive pitch/squad view.
- Player selection drawer with filters.
- Remaining budget, position counts, and club-limit indicators.
- Formation selection and captain controls.
- Empty, loading, offline/error, and success states.

#### 3.5 Mobile squad builder

- Implement the same workflow with native navigation and controls.
- Share contracts, validation messages, tokens, and API client—not DOM UI.

### Acceptance criteria

- A user can build and save a valid 15-player squad on web and mobile.
- Invalid squads cannot be saved through either UI or direct API requests.
- Fantasy-engine tests cover every scoring rule and squad constraint.
- Arabic pitch and selection interfaces remain usable in RTL.

### Day 3 prompt

```text
Execute Day 3: pure fantasy engine, catalog APIs, fantasy-team APIs, and complete responsive/native squad builders. Treat server validation as authoritative. Test every rule boundary and finish with a web/mobile demonstration of creating a legal squad and rejecting illegal squads.
```

## Day 4 — Data ingestion, fixtures, transfers, and scoring

### Goal

Move the application from static seed data to an automated match-data and scoring workflow.

### Tasks

#### 4.1 Provider abstraction

- Define `FootballDataProvider` and normalized Zod schemas.
- Implement `MockFootballDataProvider` using deterministic local JSON fixtures.
- Add a configuration switch for provider selection.
- Scaffold `ApiFootballProvider` without embedding a secret.
- Store provider mappings separately from domain IDs.

#### 4.2 Idempotent ingestion jobs

- Add BullMQ jobs for competitions, clubs, players, fixtures, live events, and final statistics.
- Use upserts, locks, retry/backoff, deduplication, and ingestion audit records.
- Add structured logs and a dead-letter/failure view.
- Never erase good data because a provider returns a partial response.

#### 4.3 Fixtures and gameweek experiences

- Web/mobile fixture list grouped by gameweek and status.
- Fixture detail with events and player statistics.
- Pull-to-refresh on mobile and polling on live screens.

#### 4.4 Transfers

- Implement transfer preview and confirmation.
- Revalidate budget, positions, club limits, deadline, and player ownership transactionally.
- Calculate free transfers and point deductions.
- Store before/after player IDs and cost in the transfer record.

#### 4.5 Scoring pipeline

- Convert normalized player stats into score breakdowns.
- Recalculate safely when provider statistics change.
- Apply captain/vice-captain and transfer deductions.
- Persist player and fantasy-team gameweek totals.
- Make repeated scoring runs idempotent.

### Acceptance criteria

- One command/job imports the mock gameweek and statistics.
- Re-running ingestion does not create duplicates.
- Re-running scoring produces the same totals.
- Users can complete a valid transfer before a deadline and cannot transfer afterward.
- Point breakdowns explain every awarded/deducted point.

### Day 4 prompt

```text
Execute Day 4: provider abstraction, deterministic mock ingestion, fixture experiences, transactional transfers, and idempotent scoring. Do not depend on a live vendor key for acceptance. Demonstrate ingestion twice without duplication and scoring twice without total drift.
```

## Day 5 — Leagues, leaderboards, live points, and notifications

### Goal

Make the game social and show fantasy results.

### Tasks

#### 5.1 Fantasy leagues

- Global league automatically includes active fantasy teams.
- Users can create a private league with name and unique join code.
- Users can join/leave private leagues.
- League owner can remove a member and rotate the join code.
- Prevent code enumeration with rate limiting and generic errors.

#### 5.2 Leaderboards

- Generate per-gameweek and overall rankings.
- Define deterministic tie-breakers in documentation.
- Cache leaderboard pages in Redis.
- Invalidate/rebuild cache after scoring.
- Add pagination and show the current user's rank even outside the first page.

#### 5.3 Live points

- Add gameweek live-points screen with player breakdowns, captain multiplier, transfer cost, provisional total, and last-updated time.
- Implement WebSocket updates if time permits; polling is the required reliable fallback.
- Clearly label provisional versus final scores.

#### 5.4 Notifications

- Store device push tokens.
- Add notification preferences.
- Implement deadline reminder and score-finalized events.
- For local acceptance, persist an in-app notification even when push credentials are unavailable.

#### 5.5 Web/mobile UI

- Private league create/join pages.
- Global/private leaderboard pages.
- In-app notification inbox.

### Acceptance criteria

- Two seeded users can join the same private league and see correct rankings.
- Ranking results are stable under ties and repeat calculations.
- A score update appears in live points without restarting the app.
- Deadline reminders appear in the local in-app inbox.

### Day 5 prompt

```text
Execute Day 5: private/global leagues, deterministic cached leaderboards, live gameweek points, and notification foundations. Ensure polling works even if WebSockets or push credentials are unavailable. Demonstrate the complete two-user private-league journey.
```

## Day 6 — Admin operations, security, observability, and full QA

### Goal

Make the MVP operable and safe enough for a controlled beta.

### Tasks

#### 6.1 Admin application

- Role-protected admin login.
- View/edit player price, position, availability, and club assignment.
- View fixtures, gameweeks, ingestion runs, and failed jobs.
- Trigger approved ingestion/scoring jobs.
- Add a scoring adjustment with mandatory reason.
- Record every mutation in AuditLog.

#### 6.2 Security pass

- Validate authorization for every resource operation.
- Add rate limiting, CORS allowlist, secure headers, request-size limits, and input sanitization.
- Check that logs never contain passwords, tokens, cookies, or provider secrets.
- Add dependency audit and secret scanning in CI.
- Add account/session revocation.

#### 6.3 Reliability and observability

- Structured logs with request/job IDs.
- Readiness and liveness endpoints.
- Error monitoring hooks.
- Metrics for API latency, job failures, ingestion freshness, and scoring lag.
- Database backup/restore documentation.

#### 6.4 End-to-end tests

Cover:

- register and login;
- build a valid squad;
- save lineup/captain;
- make a transfer;
- ingest fixture statistics;
- calculate points;
- create/join a private league;
- view leaderboard;
- apply an admin correction and verify audit history.

#### 6.5 Accessibility and localization QA

- Keyboard navigation and visible focus on web.
- Accessible labels and reasonable screen-reader behavior.
- Contrast check.
- Test narrow mobile and common desktop widths.
- Check French/English overflow and Arabic RTL on critical screens.

### Acceptance criteria

- Non-admin users cannot access any admin endpoint or page.
- Every admin mutation produces an audit entry.
- The critical E2E journey passes from a clean database.
- No high-severity dependency or obvious secret exposure remains.
- Health/observability documentation is usable by another engineer.

### Day 6 prompt

```text
Execute Day 6: admin operations, auditability, security hardening, observability, critical E2E tests, accessibility, and localization QA. Prioritize correctness and beta operability over new features. Report all unresolved security, accessibility, and data-quality risks explicitly.
```

## Day 7 — Stabilization, packaging, and beta release candidate

### Goal

Produce a reproducible, documented release candidate.

### Tasks

#### 7.1 Full clean-room verification

- Clone/restore into a clean environment.
- Follow README without undocumented steps.
- Start infrastructure, migrate, seed, build, test, and launch every app.
- Repair inconsistent scripts or missing environment variables.

#### 7.2 Performance pass

- Remove obvious N+1 queries.
- Add missing database indexes based on actual queries.
- Optimize player search and leaderboard pagination.
- Avoid over-fetching in web/mobile.
- Measure, record, and improve important API response times using seeded data.

#### 7.3 Release configuration

- Production Dockerfiles for API/workers.
- Deployment/environment guide.
- Next.js production configuration.
- Expo EAS development/preview configuration.
- Database migration and rollback procedure.
- Scheduled worker/job configuration.
- Provider rate-limit and monthly-cost safeguards.

#### 7.4 Documentation

Complete:

- architecture overview and Mermaid diagram;
- repository map;
- local setup;
- environment variable reference;
- API/OpenAPI usage;
- fantasy rules and examples;
- provider adapter guide;
- runbook for ingestion/scoring failures;
- admin guide;
- known limitations;
- privacy/data-retention outline;
- release checklist.

#### 7.5 Final acceptance test

From a clean state:

1. register two users;
2. create legal squads;
3. choose lineups and captains;
4. run a gameweek ingestion;
5. calculate points;
6. make an allowed transfer;
7. create and join a private league;
8. verify gameweek and overall ranks;
9. apply an admin correction;
10. verify recalculated totals and audit history;
11. smoke-test web, iOS simulator, and Android emulator;
12. generate preview builds where credentials allow.

Tag the release `v0.1.0-rc.1` only if all blocking acceptance criteria pass.

### Day 7 prompt

```text
Execute Day 7: stabilization and release-candidate preparation. Begin from a clean environment, fix reproducibility problems, complete performance/release/documentation work, and run the full acceptance journey. Do not tag v0.1.0-rc.1 if a blocking criterion fails. Return a release report with pass/fail evidence, known limitations, deployment instructions, and the next ten prioritized backlog items.
```

## Required daily status format

Ask Gemini to finish every day with this exact structure:

```text
DAY N STATUS

Outcome: PASS | PARTIAL | BLOCKED

Completed:
- ...

Changed files/modules:
- ...

Validation:
- command — PASS/FAIL — short result

Acceptance criteria:
- criterion — PASS/FAIL

Decisions and assumptions:
- ...

Risks/blockers:
- ...

Commits:
- hash — message

Next-day prerequisites:
- ...
```

## Scope-control rules

If the schedule slips, cut work in this order:

1. WebSockets; retain polling.
2. Real push delivery; retain in-app notifications.
3. Real API-Football adapter; retain the complete mock adapter.
4. Advanced animations and non-critical visual polish.
5. Admin convenience features; retain correction and audit essentials.

Never cut:

- server-side squad validation;
- deterministic scoring tests;
- transactional transfers;
- authentication security;
- provider abstraction;
- audit trail for manual score changes;
- clean database migration/seed flow;
- the critical end-to-end journey.

## Human inputs needed during the week

Provide these only through secure environment configuration, never in chat or source control:

- production database and Redis URLs;
- football-data provider API key;
- Apple/Google mobile signing credentials;
- push-notification credentials;
- error-monitoring DSN;
- production domain and email provider settings.

Product decisions the owner must confirm before a public launch:

- final fantasy scoring rules;
- transfer policy and deadlines;
- licensed right to use Botola/club/player names, crests, photographs, and statistics;
- privacy policy, terms, age requirements, prizes, and applicable Moroccan law;
- final Arabic terminology and French translations.

## Definition of done for the week

The MVP is complete only when a fresh developer environment can follow the README and run the entire product; two users can create squads, receive calculated points from imported mock match data, join a private league, and see correct rankings; an administrator can make an audited correction; and the critical automated test suite passes.
