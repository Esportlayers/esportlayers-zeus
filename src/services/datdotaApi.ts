import { getObj, setObj } from "../loader/redis";

import dayjs from "dayjs";
import fetch from "node-fetch";

const BASE_URL = "https://www.datdota.com/api";
const DRAFTS = "/drafts?default=true";
const DRAFT_BY_LEAGUE = "/drafts?leagues={LEAGUE_ID}";

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

interface HeroData {
  hero: number;
  heroName: string;
  bans: number;
  firstPhaseBans: number;
  secondPhaseBans: number;
  thirdPhaseBans: number;
  picks: number;
  firstPhasePicks: number;
  secondPhasePicks: number;
  thirdPhasePicks: number;
  wins: number;
  losses: number;
}

interface Response {
  data: HeroData[];
}

let lastPatchQueryTs: null | number = null;

const patchKey = (patch: string) => `datDota_draftStats_patch_${patch}`;

export async function fetchCurrentPatchHeroStats(
  heroId: number
): Promise<(HeroOverview & { totalGamesCount: number }) | null> {
  let data = await getObj<Response["data"]>(patchKey("current"));

  if (
    !data ||
    lastPatchQueryTs === null ||
    lastPatchQueryTs + 3600 <= dayjs().unix()
  ) {
    const response = await fetch(BASE_URL + DRAFTS);
    if (response.ok) {
      const { data: responseData } = (await response.json()) as Response;
      data = responseData;
      await setObj(patchKey("current"), data);
      lastPatchQueryTs = dayjs().unix();
    } else {
      return null;
    }
  }

  const heroStats = data.find(({ hero }) => hero === heroId);
  if (data.length > 0 && heroStats) {
    const totalGamesCount =
      data.reduce((acc, { picks }) => {
        return acc + picks;
      }, 0) / 10;

    return {
      totalGamesCount,
      index: 0,
      heroId: heroStats.hero,
      matchCount: heroStats.picks,
      matchWins: heroStats.wins,
      pickPhaseOne: heroStats.firstPhasePicks,
      pickPhaseTwo: heroStats.secondPhasePicks,
      pickPhaseThree: heroStats.thirdPhasePicks,
      banCount: heroStats.bans,
      banPhaseOne: heroStats.firstPhaseBans,
      banPhaseTwo: heroStats.secondPhaseBans,
      banPhaseThree: heroStats.thirdPhaseBans,
    };
  }

  return null;
}

let lastLeagueQueryTs: null | number = null;

const leagueKey = (league: number) => `datDota_draftStats_league_${league}`;

export async function fetchLeagueHeroStats(
  leagueId: number,
  heroId: number
): Promise<(HeroOverview & { totalGamesCount: number }) | null> {
  let data = await getObj<Response["data"]>(leagueKey(leagueId));

  if (
    !data ||
    lastLeagueQueryTs === null ||
    lastLeagueQueryTs + 3600 <= dayjs().unix()
  ) {
    const response = await fetch(
      BASE_URL + DRAFT_BY_LEAGUE.replace("{LEAGUE_ID}", "" + leagueId)
    );
    if (response.ok) {
      const { data: responseData } = (await response.json()) as Response;
      data = responseData;
      await setObj(leagueKey(leagueId), data);
      lastLeagueQueryTs = dayjs().unix();
    } else {
      return null;
    }
  }

  const heroStats = data.find(({ hero }) => hero === heroId);
  if (data.length > 0 && heroStats) {
    const totalGamesCount =
      data.reduce((acc, { picks }) => {
        return acc + picks;
      }, 0) / 10;

    return {
      totalGamesCount,
      index: 0,
      heroId: heroStats.hero,
      matchCount: heroStats.picks,
      matchWins: heroStats.wins,
      pickPhaseOne: heroStats.firstPhasePicks,
      pickPhaseTwo: heroStats.secondPhasePicks,
      pickPhaseThree: heroStats.thirdPhasePicks,
      banCount: heroStats.bans,
      banPhaseOne: heroStats.firstPhaseBans,
      banPhaseTwo: heroStats.secondPhaseBans,
      banPhaseThree: heroStats.thirdPhaseBans,
    };
  }

  return null;
}
