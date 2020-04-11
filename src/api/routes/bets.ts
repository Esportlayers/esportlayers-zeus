import { Router, Request, Response } from 'express';
import { reuqireAuthorization } from '../../middleware/requireAuthorization';
import { User } from '../../@types/Entities/User';
import { getUserBetSeasons, createUserBetSeason } from '../../services/entity/BetSeasons';
const route = Router();

export default (app: Router) => {
  app.use('/bets', route);

  route.get('/seasons', reuqireAuthorization, async (req: Request, res: Response) => {
      const seasons = await getUserBetSeasons((req.user as User).id);
    return res.json(seasons).status(200);
  });

  route.post('/season', reuqireAuthorization, async (req: Request, res: Response) => {
    const seasons = await createUserBetSeason((req.user as User).id, req.body);
    return res.json(seasons).status(200);
  });
};
