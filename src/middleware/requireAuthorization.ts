import { Request, Response, NextFunction } from "express";
import config from "../config";
import { loadUserById } from "../services/entity/User";
import { User } from "@streamdota/shared-types";

export async function requireAuthorization(req: Request, res: Response, next: NextFunction) {
    if(config.env === 'development') {//Bypass rights for dev enviorements
        const user = await loadUserById(1);
        if(user) {
            req.user = user;
        }
    }

    if(!req.user) {
        return res.status(401).json({msg: 'Unauthorized'});
    }

    if((req.user as User).status !== 'active') {
        return res.status(403).json({msg: 'Account disabled'});
    }

    return next();
}

export async function requireRootUser(req: Request, res: Response, next: NextFunction) {
    if(config.env === 'development') {//Bypass rights for dev enviorements
        return next();
    }

    if((req.user as User).id !== 2) {
        return res.status(403).json({msg: 'Forbidden'});
    }

    return next();
}