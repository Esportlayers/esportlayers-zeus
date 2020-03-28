import { Router, Request, Response } from 'express';
import {PassportStatic} from 'passport';
import { loadSteamConnections } from '../../services/entity/User';
import { User } from '../../@types/Entities/User';
import { reuqireAuthorization } from '../../middleware/requireAuthorization';

const route = Router();

export default (app: Router) => {
    app.use('/user', route);

    route.get('/baseData', reuqireAuthorization, (req: Request, res: Response) => {
        return res.json(req.user).status(200);
    });

    route.get('/steam', reuqireAuthorization, async (req: Request, res: Response) => {
        const connections = await loadSteamConnections((req.user as User).id);
        return res.json(connections).status(200);
    });

};
