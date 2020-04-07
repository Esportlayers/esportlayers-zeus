import { Router, Request, Response } from 'express';
import { loadSteamConnections, loadStats, loadBotData, patchBotData } from '../../services/entity/User';
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

    route.get('/bot', reuqireAuthorization, async(req: Request, res: Response) => {
        const data = await loadBotData((req.user as User).id);
        return res.json(data).status(200);
    });

    route.patch('/bot', reuqireAuthorization, async(req: Request, res: Response) => {
        const user = req.user as User;
        await patchBotData(user.id, req.body, '#' + user.displayName.toLowerCase());
        return res.json(undefined).status(200);
    });
};
