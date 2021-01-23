import { Router, Request, Response } from 'express';
import { loadSteamConnections, loadStats, patchUser, removeDotaGames, removeUser, clearUserStats } from '../../services/entity/User';
import {User} from '@streamdota/shared-types';
import { reuqireAuthorization } from '../../middleware/requireAuthorization';
import { checkUserFrameAPIKey } from '../../middleware/frameApi';
import { sendMessage } from '../../services/websocket';

const route = Router();

export default (app: Router) => {
    app.use('/user', route);

    route.get('/baseData', checkUserFrameAPIKey, reuqireAuthorization, (req: Request, res: Response) => {
        return res.json(req.user).status(200);
    });

    route.patch('/baseData', reuqireAuthorization, async (req: Request, res: Response) => {
        await patchUser((req.user as User).id, req.body);
        return res.json(req.user).status(200);
    });

    route.get('/steam', reuqireAuthorization, async (req: Request, res: Response) => {
        const connections = await loadSteamConnections((req.user as User).id);
        return res.json(connections).status(200);
    });

    route.get('/dotaStats', checkUserFrameAPIKey, reuqireAuthorization, async (req: Request, res: Response) => {
        const user = (req.user as User);
        const stats = await loadStats(user.id, user.dotaStatsFrom);
        return res.json(stats).status(200);
    });

    route.delete('/dotaStats/:ts', reuqireAuthorization, async (req: Request, res: Response) => {
        const user = (req.user as User);
        await removeDotaGames(user.id, +req.params.ts);
        sendMessage(user.id, 'dota_wl_reset', {});
        return res.sendStatus(204);
    });

    route.delete('/dotaStats', reuqireAuthorization, async (req: Request, res: Response) => {
        const user = (req.user as User);
        await clearUserStats(user.id, 0);
        sendMessage(user.id, 'dota_wl_reset', {});
        return res.sendStatus(204);
    });

    route.delete('/deleteAccount', reuqireAuthorization, async (req: Request, res: Response) => {
        const user = (req.user as User);
        await removeUser(user.id);
        return res.sendStatus(204);
    });
};
