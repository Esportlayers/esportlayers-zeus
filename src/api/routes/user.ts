import { Router, Request, Response } from 'express';
import {PassportStatic} from 'passport';
import { loadSteamConnections, loadStats } from '../../services/entity/User';
import { User } from '../../@types/Entities/User';
import { reuqireAuthorization } from '../../middleware/requireAuthorization';
import { checkUserFrameAPIKey } from '../../middleware/frameApi';

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

    route.get('/dotaStats/:frameApiKey', checkUserFrameAPIKey, reuqireAuthorization, async (req: Request, res: Response) => {
        const stats = await loadStats((req.user as User).id);
        return res.json(stats).status(200);
    });

};
