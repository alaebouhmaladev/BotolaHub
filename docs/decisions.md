# Architectural Decision Records (ADRs)

## ADR-001: Monorepo Architecture with pnpm Workspaces & Turborepo

- **Context**: BotolaHub requires a web application, mobile app, admin portal, API server, background worker, and shared domain logic.
- **Decision**: Adopt a modular monolith structure managed by pnpm workspaces and Turborepo.
- **Consequences**: Fast local builds via Turborepo caching, clear package separation, and zero duplicate contracts.

## ADR-002: Provider Abstraction (`FootballDataProvider`)

- **Context**: Football data providers may vary or require licensing; local dev & testing must proceed without external API keys.
- **Decision**: Put all football data providers behind a strict `FootballDataProvider` interface with a default `MockFootballDataProvider`.
- **Consequences**: Zero dependency on external APIs during development or testing.

## ADR-003: Pure Deterministic Fantasy Engine

- **Context**: Scoring rules must be consistent, testable, and versionable by season.
- **Decision**: Implement `packages/fantasy-engine` as pure, deterministic functions without direct database or I/O access.
- **Consequences**: Highly testable engine covered by property/unit tests with zero side effects.

## ADR-004: Multilingual & RTL First-Class Support

- **Context**: BotolaHub serves Moroccan football fans in Arabic (RTL), French, and English.
- **Decision**: Build `packages/localization` and `packages/design-tokens` with first-class RTL direction utilities (`dir="rtl"`) from Day 1.
- **Consequences**: Arabic interfaces render correctly with proper text alignment and layout direction out of the box.
