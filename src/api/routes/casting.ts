import { CastingOverlay, User } from '@streamdota/shared-types';
import { Router, Request, Response } from 'express';
import { checkUserFrameAPIKey } from '../../middleware/frameApi';
import { reuqireAuthorization } from '../../middleware/requireAuthorization';
import { patchCastingOverlay, requireCastingOverlay } from '../../services/entity/CastingOverlay';
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

    route.get('/settings', checkUserFrameAPIKey, reuqireAuthorization, async (req: Request, res: Response) => {
        const config = await requireCastingOverlay((req.user as User).id);
        return res.json(config).status(200);
    });
    
    route.patch('/settings', reuqireAuthorization, async (req: Request, res: Response) => {
        await patchCastingOverlay((req.user as User).id, req.body as CastingOverlay);
        sendMessage((req.user as User).id, 'overlay', true);
        return res.sendStatus(204);
    });

    route.post('/overlay', reuqireAuthorization, async (req: Request, res: Response) => {
        sendMessage((req.user as User).id, 'statsoverlay', req.body);
        return res.sendStatus(201);
    });
};
