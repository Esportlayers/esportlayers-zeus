import config from '../../../config';
import { getObj, setObj } from '../../../loader/redis';
import { GsiClient } from '../../../middleware/dotaGsi';
import { initializeBet, resolveBet } from '../../betting/state';
import { loadUserById, saveDotaGame } from '../../entity/User';
import { fetchMatchTeams } from '../../steamWebApi';
import { sendMessage } from '../../websocket';

//#region <interfaces>
enum GameState {
    playersLoading = 'DOTA_GAMERULES_STATE_WAIT_FOR_PLAYERS_TO_LOAD',
    heroSelection = 'DOTA_GAMERULES_STATE_HERO_SELECTION',
    strategyTime = 'DOTA_GAMERULES_STATE_STRATEGY_TIME',
    teamShowcase = 'DOTA_GAMERULES_STATE_TEAM_SHOWCASE',
    mapLoading = 'DOTA_GAMERULES_STATE_WAIT_FOR_MAP_TO_LOAD',
    preGame = 'DOTA_GAMERULES_STATE_PRE_GAME',
    running = 'DOTA_GAMERULES_STATE_GAME_IN_PROGRESS',
    postGame = 'DOTA_GAMERULES_STATE_POST_GAME'
}

export interface GameData {
    matchId: number;
    type: 'playing' | 'observing';
    gameState: GameState;
    paused: boolean;
    winner: string;
    radiantWinChance: number;
    radiant?: {
        name: string;
        logo: string;
    };
    dire?: {
        name: string;
        logo: string;
    };
}

export interface GsiMapData {
    name: string;
    matchid: string;
    game_time: number;
    clock_time: number;
    daytime: boolean;
    nightstalker_night: boolean;
    game_state: GameState;
    paused: boolean;
    win_team: 'none' | 'radiant' | 'dire';
    customgamename: string;
    radiant_ward_purchase_cooldown: number;
    dire_ward_purchase_cooldown: number;
    roshan_state: 'alive' | 'respawn_base' | 'respawn_variable';
    roshan_state_end_seconds: number;
    radiant_win_chance: number;
}
//#endregion

export function key(userId: number): string {
    return `gsi_${userId}_game`;
}

export async function process(client: GsiClient, data: any): Promise<void> {
    const oldData = await getObj<GameData>(key(client.userId));
    const newData = data?.map as GsiMapData | null;

    if(newData) {
        if(!oldData || +newData.matchid !== oldData.matchId) {
            const teamData = await fetchMatchTeams(+newData.matchid);
            const isPlaying = data?.player.hasOwnProperty('steamid');
            const gameData = {
                matchId: +newData.matchid,
                gameState: newData.game_state,
                paused: newData.paused,
                winner: newData.win_team,
                radiantWinChance: newData.radiant_win_chance,
                type: isPlaying ? 'playing' : 'observing',
                ...teamData,
            };
            sendMessage(client.userId, 'gsi_gamedata', gameData);
            await setObj(key(client.userId), gameData);
            config.debugGsi && console.log(`[${client.displayName}] Started ${isPlaying ? 'playing' : 'observing'} a game: ${+newData.matchid}`);
        }

        if(oldData) {
            const channel = '#' + client.displayName.toLowerCase();
            let changeSet: Partial<GameData> = {};
            if(oldData.paused !== newData.paused) {
                sendMessage(client.userId, 'gsi_game_paused', newData.paused);
                changeSet.paused = newData.paused;
                config.debugGsi && console.log(`[${client.displayName}] Game pause status: ${newData.paused}`);
            }
            if(oldData.gameState !== newData.game_state) {
                sendMessage(client.userId, 'gsi_game_state', newData.game_state);
                changeSet.gameState = newData.game_state;
                config.debugGsi && console.log(`[${client.displayName}] Game state changed: ${newData.game_state}`);

                if(newData.game_state === GameState.preGame && oldData.type === 'playing') {
                    await initializeBet(channel, client.userId, true);
                }
            }
            if(oldData.winner !== newData.win_team) {
                const isPlayingWin = oldData.type === 'playing' ? data.player.team_name === newData.win_team : false;
                sendMessage(client.userId, 'gsi_game_winner', {isPlayingWin, winnerTeam: newData.win_team});
                config.debugGsi && console.log(`[${client.displayName}] Game winner team changed: ${newData.win_team}`);
                changeSet.winner = newData.win_team;

                if(newData.win_team !== 'none') {
                    if(oldData.type === 'playing') {
                        await saveDotaGame(client.userId, isPlayingWin);        
                    }
                    const user = await loadUserById(client.userId);
                    await resolveBet(channel, client.userId, newData.win_team === 'radiant' ? (user?.teamAName.toLowerCase() || 'a') : (user?.teamBName.toLowerCase() || 'b'));
                }
            }
            if(oldData.radiantWinChance !== newData.radiant_win_chance) {
                sendMessage(client.userId, 'gsi_game_win_chance', newData.radiant_win_chance);
                changeSet.radiantWinChance = newData.radiant_win_chance;
                //config.debugGsi && console.log(`[${client.displayName}] Game radiant win chance changed: ${newData.radiant_win_chance}`);
            }

            const playType = data?.player.hasOwnProperty('steamid') ? 'playing' : 'observing';
            if(playType !== oldData.type) {
                sendMessage(client.userId, 'gsi_game_view_type', playType);
                changeSet.type = playType;
            }

            if(Object.keys(changeSet).length > 0) {
                await setObj(key(client.userId), {...oldData, ...changeSet});
            }
        }
    } else if(oldData) {
        await reset(client);
    }
}

export async function reset(client: GsiClient): Promise<void> {
    config.debugGsi && console.log(`[${client.displayName}] Reseting game state`);
    await setObj(key(client.userId), null);
    sendMessage(client.userId, 'gsi_gamedata', null);
    sendMessage(client.userId, 'gsi_game_paused', false);
    sendMessage(client.userId, 'gsi_game_state', null);
    sendMessage(client.userId, 'gsi_game_winner', {isPlayingWin: false, winnerTeam: 'none'});
    sendMessage(client.userId, 'gsi_game_win_chance', 0);
}

export async function intializeNewConnection(userId: number): Promise<void> {
    const data = await getObj<GameData>(key(userId));
    if(data) {
        sendMessage(userId, 'gsi_gamedata', data);
        sendMessage(userId, 'gsi_game_paused', data.paused);
        sendMessage(userId, 'gsi_game_state', data.gameState);
        sendMessage(userId, 'gsi_game_win_chance', data.radiantWinChance);
    }
}