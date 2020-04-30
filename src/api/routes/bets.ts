import { Router, Request, Response } from 'express';
import { reuqireAuthorization } from '../../middleware/requireAuthorization';
import { createBetRound, patchBetRound } from '../../services/entity/BetRound';
import { User } from '../../@types/Entities/User';
import { requireBetRoundAccess } from '../../middleware/requireBetSeasonAccess';
const route = Router();

export default (app: Router) => {
  app.use('/bets', route);

  route.post('/', reuqireAuthorization, async (req: Request, res: Response) => {
    const user = req.user as User;
    await createBetRound(user.id, user.betSeasonId);
    return res.json(undefined).status(201);
  });

  route.patch('/:roundId', reuqireAuthorization, requireBetRoundAccess('owner'), async (req: Request, res: Response) => {
    await patchBetRound(+req.params.roundId, req.body);
    return res.json(undefined).status(204);
  });
};
