import { GameState, getEvents, MorphlingEvent, MorphlingEventTypes, resetEvents } from '@esportlayers/morphling';
import { User } from '@streamdota/shared-types';
import { grey } from 'chalk';
import dayjs from 'dayjs';
import { NextFunction, Request, Response } from 'express';
import { gsiAuthTokenUnknown, loadUserById, patchUser, saveDotaGame, userConnected } from '../services/entity/User';
import { sendMessage } from '../services/websocket';
import ws from 'ws';
import { initializeBet, resolveBet } from '../services/betting/state';

//#region <heartbeat>
const heartbeat: Map<number, number> = new Map();
const connectedIds = new Set();
const knownRejections = new Set();

async function checkClientHeartbeat(): Promise<void> {
    const maxLastPing = dayjs().unix() - 16;
    const heartbeatClients = [...heartbeat.entries()];
    for(const [userId, lastInteraction] of heartbeatClients) {
        console.log(userId, lastInteraction);
        if(lastInteraction < maxLastPing) {
            sendMessage(userId, 'gsi_connected', false);
            await patchUser(userId, {gsiActive: false});
            const user = await loadUserById(userId);
            connectedIds.delete(userId);
            console.log(grey('[Dota-GSI] User disconnected by heartbeat ' + user?.displayName));
            await resetEvents('' + userId);
        }
    }
}

setInterval(checkClientHeartbeat, 5000);
//#endregion


export async function checkGSIAuthToken(req: Request, res: Response, next: NextFunction) {
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
    
    req.user = userData;

    if(!connectedIds.has(userData.id)) {
        sendMessage(userData.id, 'gsi_connected', true);
        await userConnected(userData.id);
        await patchUser(userData.id, {gsiActive: true});
        connectedIds.add(userData.id);
        console.log(grey('[Dota-GSI] Connected user ' + userData.displayName));
    }
    
    heartbeat.set(userData.id, dayjs().unix());

    return next();
}

export async function newGSIListener(_ws: ws, req: Request, next: NextFunction) {
    const clientId = (req.user as User).id;
    if(clientId) {
        const events = await getEvents('' + clientId);
        for(const {event, value} of events) {
            sendMessage(clientId, event, value);
        }
    }
    return next();
}

export async function handleMorphlingEvents(events: MorphlingEvent[], clientId: number): Promise<void> {
    if(events.length > 0 ) {
        const gameStateChange = events.find(({event}) => event === MorphlingEventTypes.gsi_game_state);
        const allEvents = await getEvents('' + clientId);
        const activity =  allEvents.find(({event}) => event === MorphlingEventTypes.gsi_game_activity);
        const user = await loadUserById(clientId);
        const channel = '#' + (user?.displayName || '').toLowerCase();
        const winner = events.find(({event}) => event === MorphlingEventTypes.gsi_game_winner);

        if(gameStateChange && activity && gameStateChange.value === GameState.preGame && activity.value === 'playing') {
            await initializeBet(channel, clientId, true);
        }

        if(winner && winner.value !== 'none') {
            if(activity && activity.value === 'playing') {
                await saveDotaGame(clientId, winner.value.isPlayingWin);        
            }
            await resolveBet(channel, clientId, winner.value === 'radiant' ? (user?.teamAName.toLowerCase() || 'a') : (user?.teamBName.toLowerCase() || 'b'));
        }
    }
}