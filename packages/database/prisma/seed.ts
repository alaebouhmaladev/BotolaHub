import { PrismaClient, UserRole, IdentityType } from '@prisma/client';
import argon2 from 'argon2';

const prisma = new PrismaClient();

export async function main() {
  console.log('🌱 Starting BotolaHub database seed...');

  // 1. Seed Competition
  const competition = await prisma.competition.upsert({
    where: { slug: 'botola-pro-inwi' },
    update: { name: 'Botola Pro Inwi', code: 'BOTOLA1' },
    create: {
      name: 'Botola Pro Inwi',
      slug: 'botola-pro-inwi',
      code: 'BOTOLA1',
    },
  });

  // 2. Seed Active Season
  const season = await prisma.season.upsert({
    where: { id: 'season-2026-2027' },
    update: {
      name: 'Botola Pro Inwi 2026/2027',
      year: '2026-2027',
      isActive: true,
      startDate: new Date('2026-09-01T00:00:00.000Z'),
      endDate: new Date('2027-06-30T23:59:59.000Z'),
    },
    create: {
      id: 'season-2026-2027',
      competitionId: competition.id,
      name: 'Botola Pro Inwi 2026/2027',
      year: '2026-2027',
      isActive: true,
      startDate: new Date('2026-09-01T00:00:00.000Z'),
      endDate: new Date('2027-06-30T23:59:59.000Z'),
    },
  });

  // 3. Seed 16 Botola Pro Clubs
  const clubsData = [
    {
      code: 'RCA',
      name: 'Raja Club Athletic',
      shortName: 'Raja CA',
      primaryColor: '#008751',
      secondaryColor: '#FFFFFF',
    },
    {
      code: 'WAC',
      name: 'Wydad Athletic Club',
      shortName: 'Wydad AC',
      primaryColor: '#C0392B',
      secondaryColor: '#FFFFFF',
    },
    {
      code: 'FAR',
      name: 'Association Sportive des FAR',
      shortName: 'AS FAR',
      primaryColor: '#000000',
      secondaryColor: '#008751',
    },
    {
      code: 'RSB',
      name: 'Renaissance Sportive de Berkane',
      shortName: 'RS Berkane',
      primaryColor: '#E67E22',
      secondaryColor: '#000000',
    },
    {
      code: 'FUS',
      name: 'Fath Union Sport',
      shortName: 'FUS Rabat',
      primaryColor: '#FFFFFF',
      secondaryColor: '#C0392B',
    },
    {
      code: 'MAS',
      name: 'Maghreb Association Sportive de Fès',
      shortName: 'MAS Fès',
      primaryColor: '#F1C40F',
      secondaryColor: '#000000',
    },
    {
      code: 'HUSA',
      name: 'Hassania Union Sport Agadir',
      shortName: 'Hassania Agadir',
      primaryColor: '#C0392B',
      secondaryColor: '#FFFFFF',
    },
    {
      code: 'OCS',
      name: 'Olympic Club de Safi',
      shortName: 'Olympic Safi',
      primaryColor: '#2980B9',
      secondaryColor: '#C0392B',
    },
    {
      code: 'IRT',
      name: 'Ittihad Riadi de Tanger',
      shortName: 'IR Tanger',
      primaryColor: '#2980B9',
      secondaryColor: '#FFFFFF',
    },
    {
      code: 'UTS',
      name: 'Union Touarga Sport',
      shortName: 'UTS Rabat',
      primaryColor: '#F39C12',
      secondaryColor: '#27AE60',
    },
    {
      code: 'MCO',
      name: "Mouloudia Club d'Oujda",
      shortName: 'MC Oujda',
      primaryColor: '#27AE60',
      secondaryColor: '#FFFFFF',
    },
    {
      code: 'SCCM',
      name: 'Sporting Chabab Mohammédia',
      shortName: 'SCC Mohammédia',
      primaryColor: '#C0392B',
      secondaryColor: '#000000',
    },
    {
      code: 'JSS',
      name: 'Jeunesse Sportive Soualem',
      shortName: 'JS Soualem',
      primaryColor: '#3498DB',
      secondaryColor: '#FFFFFF',
    },
    {
      code: 'RCAZ',
      name: 'Renaissance Club Athlétique de Zemamra',
      shortName: 'RCA Zemamra',
      primaryColor: '#27AE60',
      secondaryColor: '#2980B9',
    },
    {
      code: 'KACM',
      name: 'Kawkab Athlétique Club de Marrakech',
      shortName: 'KAC Marrakech',
      primaryColor: '#C0392B',
      secondaryColor: '#FFFFFF',
    },
    {
      code: 'CODM',
      name: 'Club Athletic CODM Meknès',
      shortName: 'CODM Meknès',
      primaryColor: '#27AE60',
      secondaryColor: '#FFFFFF',
    },
  ];

  const seededClubs: Record<string, string> = {};
  for (const c of clubsData) {
    const club = await prisma.club.upsert({
      where: { code: c.code },
      update: {
        name: c.name,
        shortName: c.shortName,
        primaryColor: c.primaryColor,
        secondaryColor: c.secondaryColor,
        isPlaceholder: true,
      },
      create: {
        code: c.code,
        name: c.name,
        shortName: c.shortName,
        primaryColor: c.primaryColor,
        secondaryColor: c.secondaryColor,
        isPlaceholder: true,
      },
    });
    seededClubs[c.code] = club.id;
  }

  // 4. Seed Test Password Hash (Argon2id)
  const defaultPasswordHash = await argon2.hash('BotolaHubTest2026!');

  // 5. Seed Admin User
  const adminEmail = 'admin@botolahub.ma';
  const adminUser = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { role: UserRole.ADMIN, isProfileCompleted: true },
    create: {
      email: adminEmail,
      role: UserRole.ADMIN,
      isProfileCompleted: true,
    },
  });

  await prisma.userIdentity.upsert({
    where: {
      type_identifier: {
        type: IdentityType.EMAIL_PASSWORD,
        identifier: adminEmail.toLowerCase(),
      },
    },
    update: { passwordHash: defaultPasswordHash, isVerified: true },
    create: {
      userId: adminUser.id,
      type: IdentityType.EMAIL_PASSWORD,
      identifier: adminEmail.toLowerCase(),
      passwordHash: defaultPasswordHash,
      isVerified: true,
    },
  });

  await prisma.userProfile.upsert({
    where: { userId: adminUser.id },
    update: {},
    create: {
      userId: adminUser.id,
      username: 'botolaadmin',
      displayName: 'Botola Admin',
      firstName: 'Admin',
      lastName: 'System',
      birthDate: new Date('1990-01-01T00:00:00.000Z'),
      city: 'Casablanca',
      favoriteClubId: seededClubs['RCA'],
    },
  });

  // 6. Seed Regular Test Users
  const testUsers = [
    {
      email: 'user1@botolahub.ma',
      username: 'botolafan1',
      displayName: 'Moroccan Fan 1',
      clubCode: 'WAC',
    },
    {
      email: 'user2@botolahub.ma',
      username: 'botolafan2',
      displayName: 'Moroccan Fan 2',
      clubCode: 'FAR',
    },
  ];

  for (const tu of testUsers) {
    const user = await prisma.user.upsert({
      where: { email: tu.email },
      update: { isProfileCompleted: true },
      create: {
        email: tu.email,
        role: UserRole.USER,
        isProfileCompleted: true,
      },
    });

    await prisma.userIdentity.upsert({
      where: {
        type_identifier: {
          type: IdentityType.EMAIL_PASSWORD,
          identifier: tu.email.toLowerCase(),
        },
      },
      update: { passwordHash: defaultPasswordHash, isVerified: true },
      create: {
        userId: user.id,
        type: IdentityType.EMAIL_PASSWORD,
        identifier: tu.email.toLowerCase(),
        passwordHash: defaultPasswordHash,
        isVerified: true,
      },
    });

    await prisma.userProfile.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        username: tu.username,
        displayName: tu.displayName,
        firstName: 'Test',
        lastName: 'User',
        birthDate: new Date('1998-05-15T00:00:00.000Z'),
        city: 'Rabat',
        favoriteClubId: seededClubs[tu.clubCode],
      },
    });
  }

  console.log('✅ Database seed completed successfully!');
  console.log(`- Season: ${season.name}`);
  console.log(`- Clubs: 16 Botola Pro clubs seeded`);
  console.log(`- Users: 1 Admin (${adminEmail}), 2 Regular Test Users`);
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
