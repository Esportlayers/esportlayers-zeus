import { Request, NextFunction, Response } from "express";
import ws from 'ws';
import {User} from '@streamdota/shared-types';
import { loadUserById, getUserByFrameApiKey } from "../services/entity/User";

export async function checkUserFrameWebsocketApiKey(ws: ws, req: Request, next: NextFunction) {
    const userData = await getUserByFrameApiKey(req.params.frameApiKey);

    let user: User | undefined = undefined;
    if(userData) {
        user = (await loadUserById(userData.id)) as User;
    }
    req.user = user;

    //@ts-ignore
    ws.user = user;

    return next();
}

export async function checkUserFrameAPIKey(req: Request, res: Response, next: NextFunction) {
    if(req.user) {
        return next();
    }

    const userData = await getUserByFrameApiKey(req.params.frameApiKey as string || req.query.frameApiKey as string);

    let user: User | undefined = undefined;
    if(userData) {
        user = (await loadUserById(userData.id)) as User;
    }
    req.user = user;

    return next();
}