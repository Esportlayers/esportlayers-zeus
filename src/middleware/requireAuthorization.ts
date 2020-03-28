import { Request, Response, NextFunction } from "express";
import config from "../config";

export async function reuqireAuthorization(req: Request, res: Response, next: NextFunction) {
    if(config.env === 'development') {//Bypass rights for dev enviorements
        return next();
    }

    if(!req.user) {
        return res.status(401).json({msg: 'Unauthorized'});
    }

    return next();
}