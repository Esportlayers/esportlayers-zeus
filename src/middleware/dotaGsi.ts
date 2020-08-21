import { Request, Response, NextFunction } from "express";
import { gsiAuthTokenUnknown, saveDotaGame, userConnected, patchUser, loadUserById } from "../services/entity/User";
import {grey} from 'chalk';
import { sendMessage } from "../services/websocket";
import dayjs from "dayjs";
import isEqual from 'lodash/isEqual';
import differenceBy from 'lodash/differenceBy';

var fs = require('fs');
var logFile = fs.createWriteStream('log.txt', { flags: 'a' });

class GsiClient {
    auth: string;
    userId: number;
    displayName: string;
    gamestate: any = {};

    constructor(auth: string, userId: number, displayName: string) {
        this.auth = auth;
        this.userId = userId;
        this.displayName = displayName;
    }
}

let clients: GsiClient[] = [];

//#region <heartbeat>
const heartbeat: Map<number, number> = new Map();

async function checkClientHeartbet(): Promise<void> {
    const maxLastPing = dayjs().unix() - 31;
    const heartbeatclients = [...heartbeat.entries()];
    for(const [userId, lastInteraction] of heartbeatclients) {
        if(lastInteraction < maxLastPing) {
            heartbeat.delete(userId);
            sendMessage(userId, 'connected', false);
            await patchUser(userId, {gsiActive: false});
            const user = await loadUserById(userId);
            connectedIds.delete(userId);
            console.log(grey('[Dota-GSI] User disconnected by heartbeat ' + user?.displayName));
            clients = clients.filter(({userId: clientUserId}) => clientUserId !== userId);
        }
    }
}

setInterval(checkClientHeartbet, 5000);
////#endregion

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


//#region <roshan state>
const oldRoshState: {[x: string]: null | {state: string; respawn: number; aegis: boolean}} = {};
const aegisState: {[x: string]: boolean} = {};

function processRoshanState(client: GsiClient, data: any): void {
    const oldState = oldRoshState[client.userId];
    const mapData = data && data.map;

    if(mapData && oldState) {
        const roshState = data && data.map && data.map.roshan_state || 'alive';
        const roshEndSecond = data && data.map.roshan_state_end_seconds || 0;
        //rosh states: 'alive' | 'respawn_base' | 'respawn_variable'
        if((oldState.state || 'alive') !== roshState || oldState.aegis !== Boolean(aegisState[client.userId]) || ((oldState.respawn || 0 ) !== roshEndSecond && (roshEndSecond === 0 || roshEndSecond % 10 === 0))) {
            if(oldState.state === 'alive' && roshState === 'respawn_base') {
                aegisState[client.userId] = true;
            }
            sendMessage(client.userId, 'roshan', {state: aegisState[client.userId] ? 'aegis' : roshState, remaining: roshEndSecond});
            logFile.write(`[Dota-GSI :: ${client.displayName}] Roshan state: ${roshState} | Respawning in ${roshEndSecond}s \n`);
        }
    }

    const newState = {
        aegis: Boolean(aegisState[client.userId]),
        state: data && data.map && data.map.roshan_state || 'alive',
        respawn: data && data.map && data.map.roshan_state_end_seconds || 0,
    }

    if(!mapData && oldState && oldState.state !== 'alive') {
        sendMessage(client.userId, 'roshan', {state: 'alive', remaining: 0});
        logFile.write(`[Dota-GSI :: ${client.displayName}] Reset rosh state as game was left \n`);
        oldRoshState[client.userId] = {
            aegis: false,
            state: 'alive',
            respawn: 0,
        };
    } else if(!isEqual(oldState, newState)) {
        oldRoshState[client.userId] = {
            aegis: Boolean(aegisState[client.userId]),
            state: data && data.map && data.map.roshan_state,
            respawn: data && data.map && data.map.roshan_state_end_seconds,
        };
    }
}
//#endregion
//#region <draft>
interface Hero {
    id: number;
    class: string;
}

interface PickState {
    bans: Hero[];
    picks: Hero[];
}

interface TeamPickState {
    dire: PickState;
    radiant: PickState;
}
const draftState: {[x: string]: TeamPickState | null} = {}; 
const rawDraftState: {[x: string]: object | null} = {};

const defaultState: TeamPickState = {
    dire: {
        bans: [],
        picks: []
    },
    radiant: {
        bans: [],
        picks: []
    }
};

function transformTeamPickState(data: {[x: string]: string}): PickState {
    const bans = [];
    const picks = [];

    for(let i = 0; i <= 6; ++i) {
        const pickId = data[`pick${i}_id`];
        const pickClass = data[`pick${i}_class`];
        const banId = data[`ban${i}_id`];
        const banClass = data[`ban${i}_class`];

        if(pickId) {
            picks.push({id: +pickId, class: pickClass});
        }

        if(banId) {
            bans.push({id: +banId, class: banClass});
        }

    }

    return {
        bans,
        picks,
    }
}

function processPicksAndBans(client: GsiClient, data: any): void {
    const oldState = draftState[client.userId] || defaultState;
    const oldRawState = rawDraftState[client.userId];
    const draftData = data && data.draft;
    const matchId = data && data.map && data.map.matchid; 

    if(draftData && Object.keys(draftData).length > 0 && oldState && !isEqual(oldRawState, draftData)) {
        const radiant = transformTeamPickState(data.draft.team2);
        const dire = transformTeamPickState(data.draft.team3);
        const radiantPickChanges = differenceBy(radiant.picks, oldState.radiant.picks, 'id');
        const radiantBanChanges = differenceBy(radiant.bans, oldState.radiant.bans, 'id');

        if(radiantPickChanges.length) {
            logFile.write(`[Dota-GSI :: ${client.displayName}] Draft updated, new radiant pick: ${JSON.stringify(radiantPickChanges)} \n`);
            sendMessage(client.userId, 'draft', {matchId, team: 'radiant', type: 'pick', change: radiantPickChanges});
        }
        if(radiantBanChanges.length) {
            logFile.write(`[Dota-GSI :: ${client.displayName}] Draft updated, new radiant ban: ${JSON.stringify(radiantBanChanges)} \n`);
            sendMessage(client.userId, 'draft', {matchId, team: 'radiant', type: 'ban', change: radiantBanChanges});
        }
        const direPickChanges = differenceBy(dire.picks, oldState.dire.picks, 'id');
        const direBanChanges = differenceBy(dire.bans, oldState.dire.bans, 'id');

        if(direPickChanges.length) {
            logFile.write(`[Dota-GSI :: ${client.displayName}] Draft updated, new dire pick: ${JSON.stringify(direPickChanges)} \n`);
            sendMessage(client.userId, 'draft', {matchId, team: 'dire', type: 'pick', change: direPickChanges});
        }
        if(direBanChanges.length) {
            logFile.write(`[Dota-GSI :: ${client.displayName}] Draft updated, new dire ban: ${JSON.stringify(direBanChanges)} \n`);
            sendMessage(client.userId, 'draft', {matchId, team: 'dire', type: 'ban', change: direBanChanges});
        }

        draftState[client.userId] = {
            radiant,
            dire
        };
    }

    rawDraftState[client.userId] = draftData;
}
//#endregion
//#region <winner>
async function processWinner(client: GsiClient, data: any): Promise<void> {
    //Game state
    const oldGameState = client.gamestate.map && client.gamestate.map.game_state;
    const newGameState = data.map && data.map.game_state;

    if(newGameState && newGameState !== oldGameState) {
        console.log(grey('[Dota-GSI] User ' + client.displayName + ' map.game_state ' + oldGameState + ' > ' + newGameState));
        const playerTeam = data.player && data.player.team_name;
        sendMessage(client.userId, 'gamestate', newGameState);

        if(data.map.game_state === GameState.postGame && playerTeam && (playerTeam === 'radiant' || playerTeam === 'dire')) {
            if(data.map.win_team === data.player.team_name) {
                console.log(grey('[Dota-GSI] User ' + client.displayName + ' detected win'));
            } else {
                console.log(grey('[Dota-GSI] User ' + client.displayName + ' detected loss'));
            }
            
            await saveDotaGame(client.userId, data.map.win_team === data.player.team_name);
            sendMessage(client.userId, 'winner', data.map.win_team === data.player.team_name);

            sendMessage(client.userId, 'roshan', {state: 'alive', remaining: 0});
            logFile.write(`[Dota-GSI :: ${client.displayName}] Reset roshan state by winner \n`);
            oldRoshState[client.userId] = {
                aegis: false,
                state: 'alive',
                respawn: 0,
            };;
        }
    }
}
//#endregion
//#region <deaths>
function processDeaths(client: GsiClient, data: any): void {
    //Death
    const oldDeaths = client.gamestate.player && client.gamestate.player.deaths || 0;
    const newDeaths = data.player && data.player.deaths || 0;
    if(newDeaths > 0 && newDeaths !== oldDeaths) {
        console.log(grey('[Dota-GSI] User ' + client.displayName + ' died.'));
        sendMessage(client.userId, 'death', newDeaths);
    }
}
//#endregion
//#region <items>
interface BaseItem {
    can_cast?: boolean;
    charges?: number;
    contains_rune?: boolean;
    cooldown?: number;
    name: string;
    passive?: boolean;
    purchaser?: number;
}

interface ParsedItem extends BaseItem {
    selfPurchased: boolean;
    location: 'slot' | 'stash';
}

interface PlayerItemStates {
    [x: string]: ParsedItem[];
}

const parsedItemState: {[x: string]: PlayerItemStates} = {};
const rawItemState: {[x: string]: string} = {};

interface ItemState {
    [x: string]: {
        [x: string]: {
            [x: string]: BaseItem;
        }
    }
}

interface SupportItemStats {
    dire: number;
    direItems: {
        item_ward_sentry: number;
        item_ward_observer: number;
        item_smoke_of_deceit: number;
        item_dust: number;
        item_gem: number;
    };
    radiant: number;
    radiantItems: {
        item_ward_sentry: number;
        item_ward_observer: number;
        item_smoke_of_deceit: number;
        item_dust: number;
        item_gem: number;
    };
}

const supportInvestment: {[x: string]: SupportItemStats} = {}; 
const healingInvestment: {[x: string]: {dire: number; radiant: number}} = {};

const supportItems = new Set(['item_ward_sentry', 'item_ward_observer', 'item_smoke_of_deceit', 'item_dust', 'item_gem']);
const healingItems = new Set(['item_clarity', 'item_faerie_fire', 'item_flask', 'item_enchanted_mango', 'item_tango']);

const priceList: {[x: string]: number} = {
    item_ward_sentry: 75,
    item_ward_observer: 0,
    item_smoke_of_deceit: 50,
    item_dust: 80,
    item_clarity: 50,
    item_faerie_fire: 70,
    item_flask: 110,
    item_enchanted_mango: 70,
    item_tango: 90,
    item_gem: 900,
};

function parseUserItems(itemState: ItemState): PlayerItemStates {
    const teamItems = Object.values(itemState);
    const state: PlayerItemStates = {};

    for(const teamPlayers of teamItems) {
        const players = Object.entries(teamPlayers);
        for(const [playerId, items] of players) {
            const id = playerId.substring(6);
            state['' + id] = Object.entries(items).reduce<ParsedItem[]>((acc, [name, item]) => {
                if(item.name && item.name !== 'empty') {
                    acc.push({
                        location: name.startsWith('slot') ? 'slot' : 'stash',
                        selfPurchased: Boolean(item.purchaser && +item.purchaser === +id),
                        ...item,
                    });
                }

                return acc;
            }, []);
        }
    }

    return state;
}

function requireHealingInvestment(userId: number): {dire: number; radiant: number} {
    if(!healingInvestment[userId]) {
        healingInvestment[userId] = {
            dire: 0,
            radiant: 0,
        };
    }
    return healingInvestment[userId];
}

function requireSupportInvestment(userId: number): SupportItemStats {
    if(!supportInvestment[userId]) {
        supportInvestment[userId] = {
            dire: 0,
            direItems: {
                item_ward_sentry: 0,
                item_ward_observer: 0,
                item_smoke_of_deceit: 0,
                item_dust: 0,
                item_gem: 0,
            },
            radiant: 0,
            radiantItems: {
                item_ward_sentry: 0,
                item_ward_observer: 0,
                item_smoke_of_deceit: 0,
                item_dust: 0,
                item_gem: 0,
            },
        };
    }
    return supportInvestment[userId];
}

function processItems(client: GsiClient, data: any): void {
    const oldStrState = rawItemState[client.userId] || {};
    const oldItemState = parsedItemState[client.userId] || {};
    const itemState = data?.items || {};
    const strItemState = JSON.stringify(itemState);

    if(oldStrState !== strItemState) {
        const newState = parseUserItems(itemState);
        const arrayState = Object.entries(newState);

        for(const [id, items] of arrayState) {
            const oldItems = oldItemState[id];

            const newItems = differenceBy(items, oldItems, 'name');
            const droppedItems = differenceBy(oldItems, items, 'name');

            if(newItems.length > 0) {
                for(const newItem of newItems) {
                    if(newItem.name === 'item_aegis') {
                        logFile.write(`[Dota-GSI :: ${client.displayName}] Aegis was picked up\n`);
                        aegisState[client.userId] = true;
                    } else if(supportItems.has(newItem.name) && newItem.selfPurchased) {
                        const supportInvestment = requireSupportInvestment(client.userId);
                        if(+id < 5) {
                            supportInvestment.radiant = supportInvestment.radiant + priceList[newItem.name];
                            //@ts-ignore
                            supportInvestment.radiantItems[newItem.name] = supportInvestment.radiantItems[newItem.name] + 1;
                        } else {
                            supportInvestment.dire = supportInvestment.dire + priceList[newItem.name];
                            //@ts-ignore
                            supportInvestment.direItems[newItem.name] = supportInvestment.direItems[newItem.name] + 1;
                        }
                        logFile.write(`[Dota-GSI :: ${client.displayName}] Changed support investment: ${supportInvestment.radiant} vs ${supportInvestment.dire}\n`);
                        for(const [item, radiantCount] of Object.entries(supportInvestment.radiantItems)) {
                            //@ts-ignore
                            const direCount = supportInvestment.direItems[item];
                            logFile.write(`[Dota-GSI :: ${client.displayName}] ${item}, Radiant: ${radiantCount}, Dire: ${direCount}\n`);
                        }
                    } else if(healingItems.has(newItem.name) && newItem.selfPurchased) {
                        const healingInvestment = requireHealingInvestment(client.userId);
                        if(+id < 5) {
                            healingInvestment.radiant = healingInvestment.radiant + priceList[newItem.name];
                        } else {
                            healingInvestment.dire = healingInvestment.dire + priceList[newItem.name];
                        }
                        logFile.write(`[Dota-GSI :: ${client.displayName}] Changed healing investment: ${healingInvestment.radiant} vs ${healingInvestment.dire}\n`);
                    }
                }
            }

            if(droppedItems.length > 0) {
                for(const droppedItem of droppedItems) {
                    if(droppedItem.name === 'item_aegis') {
                        logFile.write(`[Dota-GSI :: ${client.displayName}] Aegis was lost\n`);
                        aegisState[client.userId] = false;
                    }
                }
            }
        }
        parsedItemState[client.userId] = newState;
    }

    rawItemState[client.userId] = strItemState;
}
//#endregion

const connectedIds = new Set();
export async function checkGSIAuth(req: Request, res: Response, next: NextFunction) {
    if(!req.body.auth || !req.body.auth.token) {
        console.log(grey('[Dota-GSI] Rejected access, no auth key was given.'));
        return res.status(403).json('Forbidden').end();
    }

    const userData = await gsiAuthTokenUnknown(req.body.auth.token);
    if(!userData) {
        console.log(grey('[Dota-GSI] Rejected access with token ' + req.body.auth + ' - as auth key is not known.'));
        return res.status(404).json('Unknown Auth token').end();
    }
    
    if(userData.status !== 'active') {
        console.log(grey('[Dota-GSI] Rejected access with token ' + req.body.auth + ' - as account of ' + userData.displayName + ' is disabled'));
        return res.status(403).json('Account locked').end();
    }
    
    for (var i = 0; i < clients.length; i++) {
        if (clients[i].userId === userData.id) {
            //@ts-ignore
            req.client = clients[i];
            return next();
        }
    }

    await userConnected(userData.id);

    if(!connectedIds.has(userData.id)) {
        sendMessage(userData.id, 'connected', true);
        await patchUser(userData.id, {gsiActive: true});
        connectedIds.add(userData.id);
    }

    const newClient = new GsiClient(req.body.auth, userData.id, userData.displayName);
    clients.push(newClient);
    //@ts-ignore
    req.client = newClient;
    //@ts-ignore
    req.client.gamestate = req.body;

    console.log(grey('[Dota-GSI] Connected user ' + userData.displayName));

    return next();
}

export async function gsiBodyParser(req: Request, res: Response, next: NextFunction) {
    //@ts-ignore
    const client = (req.client as Client);
    const data = req.body;
    heartbeat.set(client.userId, dayjs().unix());

    //Game states
    await processWinner(client, data);
    processDeaths(client, data);
    processRoshanState(client, data);
    processPicksAndBans(client, data);
    processItems(client, data);

    //Update client data
    client.gamestate = data;

    return next();
}