export interface ExternalClub {
  providerId: string;
  name: string;
  shortName: string;
  code: string;
  logoUrl?: string;
}

export interface ExternalPlayer {
  providerId: string;
  clubProviderId: string;
  name: string;
  position: 'GK' | 'DEF' | 'MID' | 'FWD';
  priceTenths: number;
}

export interface ExternalFixture {
  providerId: string;
  homeClubProviderId: string;
  awayClubProviderId: string;
  gameweekNumber: number;
  kickoffTimeUtc: string;
  status: 'SCHEDULED' | 'LIVE' | 'FINISHED';
  homeScore?: number;
  awayScore?: number;
}

export interface FootballDataProvider {
  getProviderName(): string;
  fetchClubs(): Promise<ExternalClub[]>;
  fetchPlayers(): Promise<ExternalPlayer[]>;
  fetchFixtures(gameweekNumber?: number): Promise<ExternalFixture[]>;
}

export class MockFootballDataProvider implements FootballDataProvider {
  getProviderName(): string {
    return 'mock';
  }

  async fetchClubs(): Promise<ExternalClub[]> {
    return [
      {
        providerId: 'mock-club-1',
        name: 'Casablanca Athletic',
        shortName: 'CAS',
        code: 'CAS',
      },
      {
        providerId: 'mock-club-2',
        name: 'Rabat Sporting',
        shortName: 'RAB',
        code: 'RAB',
      },
    ];
  }

  async fetchPlayers(): Promise<ExternalPlayer[]> {
    return [
      {
        providerId: 'mock-player-1',
        clubProviderId: 'mock-club-1',
        name: 'Yassine Bounou (Mock)',
        position: 'GK',
        priceTenths: 55,
      },
    ];
  }

  async fetchFixtures(gameweekNumber = 1): Promise<ExternalFixture[]> {
    return [
      {
        providerId: 'mock-fixture-1',
        homeClubProviderId: 'mock-club-1',
        awayClubProviderId: 'mock-club-2',
        gameweekNumber,
        kickoffTimeUtc: new Date().toISOString(),
        status: 'SCHEDULED',
      },
    ];
  }
}
