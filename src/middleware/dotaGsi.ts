import { Request, Response, NextFunction } from "express";
import { gsiAuthTokenUnknown, saveDotaGame, userConnected, patchUser, loadUserById } from "../services/entity/User";
import {grey} from 'chalk';
import { sendMessage } from "../services/websocket";
import dayjs from "dayjs";
import isEqual from 'lodash/isEqual';
import differenceBy from 'lodash/differenceBy';

var fs = require('fs');
var logFile = fs.createWriteStream('log.txt', { flags: 'a' });

let clients: GsiClient[] = [];
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

class GsiClient {
    auth: string;
    userId: number;
    displayName: string;
    gamestate: object = {};

    constructor(auth: string, userId: number, displayName: string) {
        this.auth = auth;
        this.userId = userId;
        this.displayName = displayName;
    }
}

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

const oldRoshState: {[x: string]: null | {state: string; respawn: number;}} = {};

function processRoshanState(userId: number, data: any): void {
    const oldState = oldRoshState[userId];
    const mapData = data && data.map;

    if(mapData && oldState) {
        const roshState = data && data.map && data.map.roshan_state;
        const roshEndSecond = data && data.map.roshan_state_end_seconds;
        //rosh states: 'alive' | 'respawn_base' | 'respawn_variable'
        if(oldState.state !== roshState || (oldState.respawn !== roshEndSecond && roshEndSecond % 10 === 0)) {
            sendMessage(userId, 'roshan', {state: roshState, remaining: roshEndSecond});
            logFile.write(`[Dota-GSI :: ${userId}] Roshan state: ${roshState} | Respawning in ${roshEndSecond}s \n`);
        }
    }

    oldRoshState[userId] = {
        state: data && data.map && data.map.roshan_state,
        respawn: data && data.map && data.map.roshan_state_end_seconds,
    };
}

const oldWardState: {[x: string]: null | {
    radiantWardsPurchased: number,
    radiantWardsPlaced: number,
    radiantWardsDestroyed: number,
    direWardsPurchased: number,
    direWardsPlaced: number,
    direWardsDestroyed: number,
}} = {};

function processWardStats(userData: {id: number; displayName: string}, data: any): void {
    const oldState = oldWardState[userData.id];
    const playerData = data && data.player;

    let radiantWardsPurchased = 0, radiantWardsPlaced = 0, radiantWardsDestroyed = 0, direWardsPurchased = 0, direWardsPlaced = 0, direWardsDestroyed = 0;

    if(playerData.team2) {
        for(let i = 0; i < 5; ++i) {
            const player = playerData.team2['player' + i];
            radiantWardsPurchased += player.wards_purchased;
            radiantWardsPlaced += player.wards_placed;
            radiantWardsDestroyed += player.wards_destroyed;
        }
    }
    if(playerData.team3) {
        for(let i = 5; i < 10; ++i) {
            const player = playerData.team3['player' + i];
            direWardsPurchased += player.wards_purchased;
            direWardsPlaced += player.wards_placed;
            direWardsDestroyed += player.wards_destroyed;
        }
    }
    if(oldState 
   && (oldState.radiantWardsPurchased !== radiantWardsPurchased || oldState.radiantWardsPlaced !== radiantWardsPlaced || oldState.radiantWardsDestroyed !== radiantWardsDestroyed
    || oldState.direWardsPurchased !== direWardsPurchased || oldState.direWardsPlaced !== direWardsPlaced || oldState.direWardsDestroyed !== direWardsDestroyed)) {
        logFile.write(`[Dota-GSI :: ${userData.displayName}] Ward state | Radiant: 💰${radiantWardsPurchased}, 🎯${radiantWardsPlaced}, 🔫${radiantWardsDestroyed} | Dire: 💰${direWardsPurchased}, 🎯${direWardsPlaced}, 🔫${direWardsDestroyed}\n`);
        
    }
    oldWardState[userData.id] = {
        radiantWardsPurchased,
        radiantWardsPlaced,
        radiantWardsDestroyed,
        direWardsPurchased,
        direWardsPlaced,
        direWardsDestroyed
    };
}

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

function processPicksAndBans(userId: number, data: any): void {
    const oldState = draftState[userId] || defaultState;
    const oldRawState = rawDraftState[userId];
    const draftData = data && data.draft;

    if(draftData && Object.keys(draftData).length > 0 && oldState && !isEqual(oldRawState, draftData)) {
        const radiant = transformTeamPickState(data.draft.team2);
        const dire = transformTeamPickState(data.draft.team3);
        const radiantPickChanges = differenceBy(radiant.picks, oldState.radiant.picks, 'id');
        const radiantBanChanges = differenceBy(radiant.bans, oldState.radiant.bans, 'id');

        if(radiantPickChanges.length) {
            logFile.write(`[Dota-GSI :: ${userId}] Draft updated, new radiant pick: ${JSON.stringify(radiantPickChanges)} \n`);
        }
        if(radiantBanChanges.length) {
            logFile.write(`[Dota-GSI :: ${userId}] Draft updated, new radiant ban: ${JSON.stringify(radiantBanChanges)} \n`);
        }
        const direPickChanges = differenceBy(dire.picks, oldState.dire.picks, 'id');
        const direBanChanges = differenceBy(dire.bans, oldState.dire.bans, 'id');

        if(direPickChanges.length) {
            logFile.write(`[Dota-GSI :: ${userId}] Draft updated, new dire pick: ${JSON.stringify(direPickChanges)} \n`);
        }
        if(direBanChanges.length) {
            logFile.write(`[Dota-GSI :: ${userId}] Draft updated, new dire ban: ${JSON.stringify(direBanChanges)} \n`);
        }

        draftState[userId] = {
            radiant,
            dire
        };
    }

    rawDraftState[userId] = draftData;
}

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

    if(req.body.auth.token === '726be318-a3b1-480e-8f17-58e66363d35c') {
        processWardStats(userData, req.body);
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
        }
    }

    //Death
    const oldDeaths = client.gamestate.player && client.gamestate.player.deaths || 0;
    const newDeaths = data.player && data.player.deaths || 0;
    if(newDeaths > 0 && newDeaths !== oldDeaths) {
        console.log(grey('[Dota-GSI] User ' + client.displayName + ' died.'));
        sendMessage(client.userId, 'death', newDeaths);
    }

    //Roshan state
    processRoshanState(client.userId, data);
    processPicksAndBans(client.userId, data);

    //Update client data
    client.gamestate = data;

    return next();
}