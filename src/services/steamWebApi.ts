import fetch from 'node-fetch';
import config from '../config';
var JSONbig = require('json-bigint');

const baseRoute = 'http://api.steampowered.com/IDOTA2Match_570';
const cdnRoute = 'http://api.steampowered.com/ISteamRemoteStorage';

async function query(url: string, params: object = {}): Promise<any> {
    const allParams = {
        key: config.steamApiKey,
        ...params,
    };
    const qry = Object.entries(allParams).map(([key, val]) => `${key}=${val}`).join('&');
    const response = await fetch(baseRoute + url + '?' + qry)
    return response;
}

async function cdnQuery(id: string): Promise<any> {
    const allParams = {
        key: config.steamApiKey,
        appid: 570,
        ugcid: id,
    };
    const qry = Object.entries(allParams).map(([key, val]) => `${key}=${val}`).join('&');
    console.log(cdnRoute + '/GetUGCFileDetails/v1/' + '?' + qry);
    const response = await fetch(cdnRoute + '/GetUGCFileDetails/v1/' + '?' + qry)
    return response;
}

interface TeamScoreboard {
    score: number;
    tower_state: number;
    barraks_state: number;
    picks: Array<{hero_id: number}>;
    players: Array<{
        player_slot: number;
        account_id: number;
        hero_id: number;
        kills: number;
        death: number;
        assists: number;
        last_hits: number;
        denies: number;
        gold: number;
        level: number;
        gold_per_min: number;
        xp_per_min: number;
        ultimate_state: number;
        ultimate_cooldown: number;
        item0: number;
        item1: number;
        item2: number;
        item3: number;
        item4: number;
        item5: number;
        respawn_timer: number;
        position_x: number;
        position_y: number;
        net_worth: number;
    }>;
    abilities: Array<{
        ability_id: number;
        ability_level: number;
    }>;
}

interface LiveLeagueGame {
    players: Array<{
        account_id: number;
        name: string;
        hero_id: number;
        team: number;
    }>;
    radiant_team: {
        team_name: string;
        team_id: number;
        team_logo: number;
        complete: boolean;
    };
    dire_team: {
        team_name: string;
        team_id: number;
        team_logo: number;
        complete: boolean;
    };
    lobby_id: number;
    match_id: number;
    spectators: number;
    league_id: number;
    league_node_id: number;
    stream_delay_s: number;
    radiant_series_wins: number;
    dire_series_wins: number;
    series_type: number;
    scoreboard: {
        duration: number;
        roshan_respawn_timer: number;
        radiant: TeamScoreboard;
        dire: TeamScoreboard;
    }
}

export async function fetchGame(matchId: number): Promise<LiveLeagueGame | null> {
    const response = await query('/GetLiveLeagueGames/v1');

    if(response.ok) {
        const raw = await response.text();
        const data = JSONbig.parse(raw) as unknown as {result: {games: LiveLeagueGame[]}};
        const game = data.result.games.find(({match_id}) => match_id === matchId);
        return game ?? null;
    }

    return null;
}

interface TeamsResponse {
    radiant: {
        name: string;
        logo: string;
    };
    dire: {
        name: string;
        logo: string;
    };
}

export async function fetchMatchTeams(matchId: number): Promise<TeamsResponse | null> {
    const game = await fetchGame(matchId);
    if(game) {
        if(game.radiant_team && game.dire_team) {
            const radiantLogoUrl = await fetchTeamLogo('' + game.radiant_team.team_logo);
            const direLogoUrl = await fetchTeamLogo('' + game.dire_team.team_logo);

            return {
                radiant: {
                    name: game.radiant_team.team_name,
                    logo: radiantLogoUrl,
                },
                dire: {
                    name: game.dire_team.team_name,
                    logo: direLogoUrl,
                },
            };
        }
    }

    return null;
}

async function fetchTeamLogo(logo: string): Promise<string> {
    const response = await cdnQuery(logo);
    if(response.ok) {
        const data = await response.json();
        return data.data.url;
    }

    return '';
}