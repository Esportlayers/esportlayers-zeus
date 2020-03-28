import { Request, Response, NextFunction } from "express";
import { gsiAuthTokenUnknown, loadUserById } from "../services/entity/User";
import {grey} from 'chalk';
import ws from 'ws';
import { User } from "../@types/Entities/User";
import expressWs from "express-ws";

const clients: GsiClient[] = [];

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
    
    for (var i = 0; i < clients.length; i++) {
        if (clients[i].userId === userData.id) {
            //@ts-ignore
            req.client = clients[i];
            return next();
        }
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

export async function checkLiveGSIAuth(ws: ws, req: Request, next: NextFunction) {
    const userData = await gsiAuthTokenUnknown(req.params.gsiAuth);

    let user: User | undefined = undefined;
    if(userData) {
        user = (await loadUserById(userData.id)) as User;
    }
    req.user = user;

    //@ts-ignore
    ws.user = user;

    return next();
}

export async function gsiBodyParser(req: Request, res: Response, next: NextFunction) {
    //@ts-ignore
    const client = (req.client as Client);
    const data = req.body;

    //Evaluate changes

    //Game state
    const oldGameState = client.gamestate.map && client.gamestate.map.game_state;
    const newGameState = data.map && data.map.game_state;

    if(newGameState && newGameState !== oldGameState) {
        console.log(grey('[Dota-GSI] User ' + client.displayName + ' map.game_state ' + oldGameState + ' > ' + newGameState));
        const playerTeam = data.player && data.player.team_name;
        //@ts-ignore
        const wsClient = expressWs.getWss().clients.find((c) => c.user.id === req.user.id);
        wsClient && wsClient.send(JSON.stringify({type: 'gamestate', value: newGameState }));

        if(data.map.game_state === GameState.postGame && playerTeam) {
            if(data.map.win_team === data.player.team_name) {
                console.log(grey('[Dota-GSI] User ' + client.displayName + ' detected win'));
            } else {
                console.log(grey('[Dota-GSI] User ' + client.displayName + ' detected loss'));
            }
            wsClient && wsClient.send(JSON.stringify({type: 'winner', value: data.map.win_team === data.player.team_name}));
        }
    }

    //Death
    const oldDeaths = client.gamestate.player && client.gamestate.player.deaths || 0;
    const newDeaths = data.player && data.player.deaths || 0;
    if(newDeaths > 0 && newDeaths !== oldDeaths) {
        console.log(grey('[Dota-GSI] User ' + client.displayName + ' died.'));
    }

    //Update client data
    client.gamestate = data;

    return next();
}