import { Request, Response, NextFunction } from "express";

export async function reuqireAuthorization(req: Request, res: Response, next: NextFunction) {
    if(!req.user) {
        return res.status(401).json({msg: 'Unauthorized'});
    }

    return next();
}