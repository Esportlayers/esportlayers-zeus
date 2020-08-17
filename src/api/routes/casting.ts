import { Router, Request, Response } from 'express';
import { reuqireAuthorization } from '../../middleware/requireAuthorization';
import { fetchHeroStats } from '../../services/stratzApi';

const route = Router();

export default (app: Router) => {
    app.use('/casting', route);

    route.get('/heroStats/:leagueId/:heroId', reuqireAuthorization, async (req: Request, res: Response) => {
        const heroStats = await fetchHeroStats(+req.params.leagueId, +req.params.heroId);

        if(heroStats === null) {
            return res.json(undefined).status(503);
        }
        
        return res.json(heroStats).status(200);
    });
};
