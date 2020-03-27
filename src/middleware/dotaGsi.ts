import { Request, Response, NextFunction } from "express";
import { gsiAuthTokenUnknown } from "../services/entity/User";
import {grey} from 'chalk';

const clients: GsiClient[] = [];

class GsiClient {
    ip: string;
    auth: string;
    userId: number;
    gamestate: object = {};

    constructor(ip: string, auth: string, userId: number) {
        this.ip = ip;
        this.auth = auth;
        this.userId = userId;
    }
}

export const checkGSIAuth = () => async (req: Request & {client: GsiClient}, res: Response, next: NextFunction) => {
    if(!req.body.auth || !req.body.auth.token) {
        console.log(grey('[Dota-GSI] Rejected access from ' + req.ip + ' as no auth key was given.'));
        return res.status(403).json('Foridden').end();
    }

    const userId = await gsiAuthTokenUnknown(req.body.auth.token);
    if(!userId) {
        console.log(grey('[Dota-GSI] Rejected access from ' + req.ip + ' as auth key is not known.'));
        return res.status(404).json('Unknown Auth token').end();
    }
    
    for (var i = 0; i < clients.length; i++) {
        if (clients[i].ip === req.ip) {
            req.client = clients[i];
            return next();
        }
    }

    const newClient = new GsiClient(req.ip, req.body.auth, userId);
    clients.push(newClient);
    req.client = newClient;
    req.client.gamestate = req.body;

    console.log(grey('[Dota-GSI] Connected new user with id ' + userId + ' from ' + req.ip));

    return next();
}
