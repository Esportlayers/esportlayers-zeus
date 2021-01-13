import { Router, Request, Response } from 'express';
import { reuqireAuthorization } from '../../middleware/requireAuthorization';
import { fetchMatchTeams } from '../../services/steamWebApi';

const route = Router();

export default (app: Router) => {
    app.use('/live', route);

    route.get('/teams/:matchId', reuqireAuthorization, async (req: Request, res: Response) => {
        const teamsData = await fetchMatchTeams(+req.params.matchId);
        if(teamsData) {
            return res.json({id: +req.params.matchId, ...teamsData}).status(200);
        }
        return res.json({
            id: +req.params.matchId,
            radiant: {
                name: 'Radiant',
                logo: null,
            },
            dire: {
                name: 'Dire',
                logo: null,
            }
        }).status(200);
    });
    
    route.post('/keywordQuestion', reuqireAuthorization, async (req: Request, res: Response) => {
        console.log(req.body);
        return res.sendStatus(204);
    });
};
