import { Request, Response, NextFunction } from 'express';
import { gsiAuthTokenUnknown, userConnected, patchUser, loadUserById } from '../services/entity/User';
import {grey} from 'chalk';
import { sendMessage } from '../services/websocket';
import dayjs from 'dayjs';
import {intializeNewConnection as initializeDraft, process as draftProcess, reset as draftReset} from '../services/dotaGsi/handler/draft';
import {intializeNewConnection as initializeGameData, process as gameDataProcess, reset as gameDataReset} from '../services/dotaGsi/handler/game';
import {intializeNewConnection as initializeWards, process as wardsProcess, reset as wardsReset} from '../services/dotaGsi/handler/wards';
import {intializeNewConnection as initializeRoshan, process as roshanProcess, reset as roshanReset} from '../services/dotaGsi/handler/roshan';
import {intializeNewConnection as initializeAegis, process as aegisProcess, reset as aegisReset} from '../services/dotaGsi/handler/aegis';
import {intializeNewConnection as initializePlayer, process as playerProcess, reset as playerReset} from '../services/dotaGsi/handler/player';
import config from '../config';

export class GsiClient {
    auth: string;
    userId: number;
    displayName: string;

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
            sendMessage(userId, 'gsi_connected', false);
            await patchUser(userId, {gsiActive: false});
            const user = await loadUserById(userId);
            connectedIds.delete(userId);
            console.log(grey('[Dota-GSI] User disconnected by heartbeat ' + user?.displayName));
            const client = clients.find(({userId: clientUserId}) => clientUserId === userId)!;
            await gameDataReset(client);
            await draftReset(client);
            await roshanReset(client);
            await wardsReset(client);
            await aegisReset(client);
            await playerReset(client);
            clients = clients.filter(({userId: clientUserId}) => clientUserId !== userId);
        }
    }
}

setInterval(checkClientHeartbet, 5000);
//#endregion

const connectedIds = new Set();
const knownRejections = new Set();
export async function checkGSIAuth(req: Request, res: Response, next: NextFunction) {
    if(!req.body.auth || !req.body.auth.token) {
        console.log(grey('[Dota-GSI] Rejected access; no auth key was given.'));
        return res.status(403).json('Forbidden').end();
    }
    if(knownRejections.has(req.body.auth.token)) {
        return res.status(404).json('Unknown Auth token').end();
    }

    const userData = await gsiAuthTokenUnknown(req.body.auth.token);

    if(!userData) {
        knownRejections.add(req.body.auth.token);
        console.log(grey('[Dota-GSI] Rejected access with token ' + req.body.auth.token + ' - as auth key is not known.'));
        return res.status(404).json('Unknown Auth token').end();
    }
    
    if(userData.status !== 'active') {
        console.log(grey('[Dota-GSI] Rejected access with token ' + req.body.auth.token + ' - as account of ' + userData.displayName + ' is disabled'));
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
        sendMessage(userData.id, 'gsi_connected', true);
        await patchUser(userData.id, {gsiActive: true});
        connectedIds.add(userData.id);
    }

    const newClient = new GsiClient(req.body.auth, userData.id, userData.displayName);
    clients.push(newClient);
    //@ts-ignore
    req.client = newClient;

    console.log(grey('[Dota-GSI] Connected user ' + userData.displayName));

    return next();
}


export async function checkRecordingGSIAuth(req: Request, res: Response, next: NextFunction) {
    if(!req.body.auth || !req.body.auth.token || req.body.auth.token !== config.gsiRecordingKey) {
        console.log(grey('[Dota-GSI-Recording] Rejected access; no auth key was given or is not the recording key'));
        return res.status(403).json('Forbidden').end();
    }
    return next();
}

export async function gsiBodyParser(req: Request, res: Response, next: NextFunction) {
    //@ts-ignore
    const client = req.client;
    const data = req.body;
    heartbeat.set(client.userId, dayjs().unix());

    await gameDataProcess(client, data);
    await draftProcess(client, data);
    await wardsProcess(client, data);
    await aegisProcess(client, data);
    await roshanProcess(client, data);
    await playerProcess(client, data);

    return next();
}

export async function newGsiListener(userId: number) {
    if(userId) {
        await initializeGameData(userId);
        await initializeDraft(userId);
        await initializeWards(userId);
        await initializeAegis(userId);
        await initializeRoshan(userId);
        await initializePlayer(userId);
    }
}