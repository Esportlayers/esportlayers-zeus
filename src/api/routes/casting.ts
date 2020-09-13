import { User } from '@streamdota/shared-types';
import { Router, Request, Response } from 'express';
import { reuqireAuthorization } from '../../middleware/requireAuthorization';
import { fetchHeroStats } from '../../services/stratzApi';
import { sendMessage } from '../../services/websocket';

const route = Router();

export default (app: Router) => {
    app.use('/casting', route);

    route.get('/heroStats/:leagueId/:heroId', reuqireAuthorization, async (req: Request, res: Response) => {
        const heroStats = await fetchHeroStats(+req.params.leagueId, +req.params.heroId);

        if(heroStats === null) {
            return res.sendStatus(503);
        }
        
        return res.json(heroStats).status(200);
    });

    route.post('/overlay', reuqireAuthorization, async (req: Request, res: Response) => {
        sendMessage((req.user as User).id, 'statsoverlay', req.body);
        return res.sendStatus(201);
    });
};
