import { Router, Request, Response } from 'express';
import {PassportStatic} from 'passport';
import { loadSteamConnections } from '../../services/entity/User';
import { User } from '../../@types/Entities/User';

const route = Router();

export default (app: Router) => {
    app.use('/user', route);

    route.get('/baseData', (req: Request, res: Response) => {
        if(!req.user) {
            return res.status(401).json({msg: 'Unauthorized'});
        }
        return res.json(req.user).status(200);
    });

    route.get('/steam', async (req: Request, res: Response) => {
        if(!req.user) {
            return res.status(401).json({msg: 'Unauthorized'});
        }
        const connections = await loadSteamConnections((req.user as User).id);
        return res.json(connections).status(200);
    });

};
