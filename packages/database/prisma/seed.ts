/**
 * BotolaHub — Deterministic, idempotent seed script
 *
 * Run: pnpm db:seed
 *
 * Produces identical logical data on every run via upserts keyed on stable
 * identifiers. Does NOT delete existing data — safe to run against a
 * database that already has the seed applied.
 */
import dotenv from "dotenv";
dotenv.config();

import { PrismaClient, Position, GameweekStatus, FixtureStatus } from "@prisma/client";
import * as argon2 from "argon2";

const prisma = new PrismaClient();

// ─── Constants ───────────────────────────────────────────────────────────────

const SEASON_LABEL = "2024-25";
const SEASON_START = new Date("2024-09-14T00:00:00Z");
const SEASON_END = new Date("2025-05-31T23:59:59Z");
const GAMEWEEK_COUNT = 30;

// 16 original placeholder clubs (no real crests, no trademark names)
const CLUBS = [
  { short: "WAC", name: "Western Athletic Club", nameAr: "نادي الغرب الرياضي", nameFr: "Club Athlétique de l'Ouest", city: "Casablanca" },
  { short: "RCA", name: "Red Crescent Athletic", nameAr: "الهلال الأحمر الرياضي", nameFr: "Athlétique Croissant Rouge", city: "Casablanca" },
  { short: "FAR", name: "Far Stars FC", nameAr: "نجوم الأفق", nameFr: "FC Étoiles Lointaines", city: "Rabat" },
  { short: "MAJ", name: "Maghreb Juniors FC", nameAr: "شباب المغرب", nameFr: "FC Jeunesse Maghreb", city: "Fès" },
  { short: "OLM", name: "Olive Mountain FC", nameAr: "نادي الجبل الأخضر", nameFr: "FC Montagne Verte", city: "Marrakech" },
  { short: "AHN", name: "Atlas Highlands", nameAr: "أطلس الهضاب", nameFr: "Hauts Atlas FC", city: "Meknès" },
  { short: "TAN", name: "Tangerines FC", nameAr: "نادي البرتقال", nameFr: "FC Les Oranges", city: "Tanger" },
  { short: "OUA", name: "Oualili United", nameAr: "وليلي المتحد", nameFr: "Oualili United FC", city: "Meknès" },
  { short: "CRT", name: "Crescent Titans", nameAr: "عمالقة الهلال", nameFr: "Titans Croissant FC", city: "Oujda" },
  { short: "SOU", name: "Souss Lions", nameAr: "أسود سوس", nameFr: "Lions du Souss FC", city: "Agadir" },
  { short: "KHM", name: "Khamsin Warriors", nameAr: "محاربو الخمسين", nameFr: "FC Guerriers du Vent", city: "Dakhla" },
  { short: "BNI", name: "Beni Stars FC", nameAr: "نجوم بني", nameFr: "FC Étoiles de Beni", city: "Al Hoceïma" },
  { short: "SAF", name: "Saffron United", nameAr: "الزعفران المتحد", nameFr: "Safran United FC", city: "Taliouine" },
  { short: "SIL", name: "Silver Dunes FC", nameAr: "الكثبان الفضية", nameFr: "FC Dunes d'Argent", city: "Laayoune" },
  { short: "GHR", name: "Gharb Rovers", nameAr: "متجولو الغرب", nameFr: "Rovers du Gharb FC", city: "Kénitra" },
  { short: "ZIL", name: "Zilzal Thunder", nameAr: "رعد الزلزال", nameFr: "Tonnerre Zilzal FC", city: "Nador" },
] as const;

// Position distribution: 2 GK, 5 DEF, 5 MID, 3 FWD per squad → spread across clubs
const POSITION_DIST: { position: Position; count: number; priceRange: [number, number] }[] = [
  { position: "GK", count: 2, priceRange: [45, 65] },
  { position: "DEF", count: 5, priceRange: [45, 80] },
  { position: "MID", count: 5, priceRange: [55, 100] },
  { position: "FWD", count: 3, priceRange: [65, 120] },
];

// Total = 15 players per club × 16 clubs = 240 players
const PLAYERS_PER_CLUB = 15;

// Common Moroccan first and last names (placeholder — no real player data)
const FIRST_NAMES = [
  "Yassine", "Omar", "Hamza", "Nabil", "Rachid", "Amine", "Khalid",
  "Mehdi", "Soufiane", "Bilal", "Ayman", "Tariq", "Imad", "Hicham", "Abderrahim",
  "Zakaria", "Iliass", "Ayoub", "Saad", "Moussa",
];
const LAST_NAMES = [
  "Alaoui", "Benali", "Hamdane", "Filali", "Mansouri", "Chraibi", "Tahiri",
  "Moussaoui", "Lahlou", "Berrada", "Ouahabi", "Zeroual", "Benhaddou",
  "Raji", "Kettani", "Bensouda", "Amazigh", "Benchekroun", "Tazi", "Naciri",
];

function seededName(clubIndex: number, playerIndex: number) {
  const fi = (clubIndex * PLAYERS_PER_CLUB + playerIndex) % FIRST_NAMES.length;
  const li = (clubIndex * PLAYERS_PER_CLUB + playerIndex + 3) % LAST_NAMES.length;
  return { firstName: FIRST_NAMES[fi]!, lastName: LAST_NAMES[li]! };
}

function seededPrice(min: number, max: number, seed: number): number {
  // Deterministic price in tenths (e.g. 55 = 5.5 credits)
  const range = max - min;
  const raw = min + (seed % (range + 1));
  // Round to nearest 5 to get "integer-tenth" multiples of 0.5
  return Math.round(raw / 5) * 5;
}

async function main() {
  console.log("🌱 Starting BotolaHub seed...");

  // ─── Competition ───────────────────────────────────────────────────────────
  const competition = await prisma.competition.upsert({
    where: { id: "comp-botola-pro-2024" },
    create: {
      id: "comp-botola-pro-2024",
      name: "Botola Pro Inwi D1",
      nameAr: "البطولة الاحترافية إنوي الدرجة الأولى",
      nameFr: "Botola Pro Inwi D1",
      country: "Morocco",
    },
    update: {},
  });
  console.log(`✅ Competition: ${competition.name}`);

  // ─── Season ────────────────────────────────────────────────────────────────
  const season = await prisma.season.upsert({
    where: { competitionId_label: { competitionId: competition.id, label: SEASON_LABEL } },
    create: {
      id: "season-2024-25",
      competitionId: competition.id,
      label: SEASON_LABEL,
      isActive: true,
      startDate: SEASON_START,
      endDate: SEASON_END,
    },
    update: { isActive: true },
  });
  console.log(`✅ Season: ${season.label}`);

  // ─── Clubs ─────────────────────────────────────────────────────────────────
  const clubRecords: Array<{ id: string; shortName: string }> = [];
  for (const [i, c] of CLUBS.entries()) {
    const club = await prisma.club.upsert({
      where: { seasonId_shortName: { seasonId: season.id, shortName: c.short } },
      create: {
        id: `club-${c.short.toLowerCase()}`,
        seasonId: season.id,
        name: c.name,
        nameAr: c.nameAr,
        nameFr: c.nameFr,
        shortName: c.short,
        city: c.city,
        crestUrl: `/assets/crests/${c.short.toLowerCase()}.svg`,
      },
      update: {},
    });
    clubRecords.push({ id: club.id, shortName: c.short });
  }
  console.log(`✅ Clubs: ${clubRecords.length}`);

  // ─── Players ───────────────────────────────────────────────────────────────
  let totalPlayers = 0;
  for (const [ci, club] of clubRecords.entries()) {
    let playerIndex = 0;
    for (const pd of POSITION_DIST) {
      for (let p = 0; p < pd.count; p++) {
        const { firstName, lastName } = seededName(ci, playerIndex);
        const playerId = `player-${club.shortName.toLowerCase()}-${playerIndex}`;
        const price = seededPrice(pd.priceRange[0], pd.priceRange[1], ci * 100 + playerIndex);

        await prisma.player.upsert({
          where: { id: playerId },
          create: { id: playerId, firstName, lastName, position: pd.position, nationality: "Moroccan" },
          update: {},
        });

        await prisma.playerSeason.upsert({
          where: { playerId_seasonId: { playerId, seasonId: season.id } },
          create: {
            id: `ps-${club.shortName.toLowerCase()}-${playerIndex}`,
            playerId,
            seasonId: season.id,
            clubId: club.id,
            status: "AVAILABLE",
            pricePoints: price,
          },
          update: {},
        });

        playerIndex++;
        totalPlayers++;
      }
    }
  }
  console.log(`✅ Players: ${totalPlayers}`);

  // ─── Gameweeks ─────────────────────────────────────────────────────────────
  const gameweekRecords: Array<{ id: string; number: number }> = [];
  for (let gw = 1; gw <= GAMEWEEK_COUNT; gw++) {
    const startOffset = (gw - 1) * 7;
    const gwStart = new Date(SEASON_START);
    gwStart.setDate(gwStart.getDate() + startOffset);
    const gwEnd = new Date(gwStart);
    gwEnd.setDate(gwEnd.getDate() + 6);
    const deadline = new Date(gwStart);

    const status: GameweekStatus =
      gw < 4 ? "FINISHED" : gw === 4 ? "ACTIVE" : "SCHEDULED";

    const gwId = `gw-2024-25-${gw}`;
    const gameweek = await prisma.gameweek.upsert({
      where: { seasonId_number: { seasonId: season.id, number: gw } },
      create: {
        id: gwId,
        seasonId: season.id,
        number: gw,
        status,
        deadlineUtc: deadline,
        startDate: gwStart,
        endDate: gwEnd,
      },
      update: { status },
    });
    gameweekRecords.push({ id: gameweek.id, number: gw });
  }
  console.log(`✅ Gameweeks: ${gameweekRecords.length}`);

  // ─── Fixtures (round-robin for first 4 gameweeks) ─────────────────────────
  // Each gameweek has 8 fixtures (16 clubs / 2)
  let fixtureCount = 0;
  for (let gw = 1; gw <= 4; gw++) {
    const gwRec = gameweekRecords.find((g) => g.number === gw)!;
    const gwStart = new Date(SEASON_START);
    gwStart.setDate(gwStart.getDate() + (gw - 1) * 7);

    for (let m = 0; m < 8; m++) {
      const homeIdx = m;
      const awayIdx = 15 - m;
      const kickoff = new Date(gwStart);
      kickoff.setHours(kickoff.getHours() + m * 2);

      const fixtureId = `fix-gw${gw}-${m}`;
      const fixtureStatus: FixtureStatus = gw < 4 ? "FINISHED" : gw === 4 ? "LIVE" : "SCHEDULED";

      await prisma.fixture.upsert({
        where: { id: fixtureId },
        create: {
          id: fixtureId,
          gameweekId: gwRec.id,
          homeClubId: clubRecords[homeIdx]!.id,
          awayClubId: clubRecords[awayIdx]!.id,
          status: fixtureStatus,
          kickoffUtc: kickoff,
          homeScore: gw < 4 ? (m % 3) : null,
          awayScore: gw < 4 ? ((m + 1) % 2) : null,
        },
        update: {},
      });
      fixtureCount++;
    }
  }
  console.log(`✅ Fixtures: ${fixtureCount}`);

  // ─── Scoring rule set ──────────────────────────────────────────────────────
  await prisma.scoringRuleSet.upsert({
    where: { seasonId_version: { seasonId: season.id, version: 1 } },
    create: {
      id: "srs-2024-25-v1",
      seasonId: season.id,
      version: 1,
      isActive: true,
      rules: {
        minutesThreshold: 60,
        minutesBelow: 1,
        minutesAbove: 2,
        goalPoints: { GK: 6, DEF: 6, MID: 5, FWD: 4 },
        assistPoints: 3,
        cleanSheetPoints: { GK: 4, DEF: 4, MID: 1, FWD: 0 },
        savesPerPoint: 3,
        penaltySave: 5,
        penaltyMiss: -2,
        yellowCard: -1,
        redCard: -3,
        ownGoal: -2,
        goalsConcededPer: 2,
        goalsConcededPoints: -1,
      },
    },
    update: {},
  });

  // ─── Dev users ─────────────────────────────────────────────────────────────
  const devPassword = await argon2.hash("Password123!", { type: argon2.argon2id });

  await prisma.user.upsert({
    where: { email: "admin@botolahub.dev" },
    create: {
      id: "user-dev-admin",
      email: "admin@botolahub.dev",
      displayName: "BotolaHub Admin",
      passwordHash: devPassword,
      role: "ADMIN",
      preferredLanguage: "en",
    },
    update: {},
  });

  await prisma.user.upsert({
    where: { email: "player1@botolahub.dev" },
    create: {
      id: "user-dev-player1",
      email: "player1@botolahub.dev",
      displayName: "Test Player 1",
      passwordHash: devPassword,
      role: "USER",
      preferredLanguage: "ar",
    },
    update: {},
  });

  await prisma.user.upsert({
    where: { email: "player2@botolahub.dev" },
    create: {
      id: "user-dev-player2",
      email: "player2@botolahub.dev",
      displayName: "Test Player 2",
      passwordHash: devPassword,
      role: "USER",
      preferredLanguage: "fr",
    },
    update: {},
  });

  console.log(`✅ Dev users: admin@botolahub.dev, player1@botolahub.dev, player2@botolahub.dev (all pw: Password123!)`);
  console.log("\n🎉 Seed completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
