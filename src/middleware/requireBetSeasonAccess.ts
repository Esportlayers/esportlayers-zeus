import { Request, Response, NextFunction } from "express";
import { getUserBetSeasonRole } from "../services/entity/BetSeasons";
import { User } from "../@types/Entities/User";
import { rolePrio } from "../@types/Entities/BetSeason";

export function requireBetSeasonAccess(requiredAccess: 'owner' | 'editor' | 'user'): (req: Request, res: Response, next: NextFunction) => void {
    return async (req: Request, res: Response, next: NextFunction) => {
        if(!req.user) {
            return res.status(401).json({msg: 'Unauthorized'});
        }

        const seasonId = +req.params.seasonId;

        if(!seasonId) {
            return res.status(404).json({msg: 'Unknown route'});
        }

        const userRole = await getUserBetSeasonRole((req.user as User).id, seasonId);

        if(!userRole) {
            return res.status(404).json({msg: 'Unknown bet season'});
        }

        if(rolePrio[userRole] < rolePrio[requiredAccess]) {
            return res.status(403).json({msg: 'Forbidden'});
        }
    
        return next();
    }
}