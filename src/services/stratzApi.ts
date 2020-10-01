import fetch from 'node-fetch';

const BASE_URL = 'https://api.stratz.com/api/v1';

export interface HeroOverview {
    index: number;
    heroId: number;
    matchCount: number;
    matchWins: number;
    pickPhaseOne: number;
    pickPhaseTwo: number;
    pickPhaseThree: number;
    banCount: number;
    banPhaseOne: number;
    banPhaseTwo: number;
    banPhaseThree: number;
}

interface HeroStats {
    index: number;
    heroId: number;
    kills: number;
    deaths: number;
    assists: number;
    cs: number;
    gpm: number;
    xpm: number;
    heal: number;
    heroDamage: number;
    towerDamage: number;
    killContribution: number;
}

interface HeroGames {
    index: number;
    heroId: number;
    values: Array<{
        steamId: number;
        matchCount: number;
        matchWins: number;
        imp: number
    }>;
}

interface LeagueHeroTableResponse {
    leagueTableHero: {
        overview: HeroOverview[];
        stats: HeroStats[];
        heroCount: number;
        heroes: HeroGames[];
    }
}

export async function fetchHeroStats(leagueId: number, heroId: number): Promise<HeroOverview & {totalGamesCount: number} | null> {
    const response = await fetch(BASE_URL + `/league/${leagueId}/tables?tableType=Hero`);

    if(response.ok) {
        const {leagueTableHero: {overview}} = (await response.json()) as LeagueHeroTableResponse;
        const heroStats = overview.find(({heroId: responseHeroId}) => responseHeroId === heroId);
        const totalGamesCount = overview.reduce((acc, {matchCount}) => {
            return acc + matchCount;
        }, 0) / 10;

        return {
            totalGamesCount,
            index: 0,
            heroId: 0,
            matchCount: 0,
            matchWins: 0,
            pickPhaseOne: 0,
            pickPhaseTwo: 0,
            pickPhaseThree: 0,
            banCount: 0,
            banPhaseOne: 0,
            banPhaseTwo: 0,
            banPhaseThree: 0,
            ...heroStats,
        };
    }

    return null;
}
