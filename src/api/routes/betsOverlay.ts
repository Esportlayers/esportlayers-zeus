import { Router, Request, Response } from 'express';
import { reuqireAuthorization } from '../../middleware/requireAuthorization';
import { User } from '../../@types/Entities/User';
import { requireBetOverlay, patchBetOverlay } from '../../services/entity/BetOverlay';

const route = Router();

export default (app: Router) => {
  app.use('/betsOverlay', route);

  route.get('/', reuqireAuthorization, async (req: Request, res: Response) => {
    const user = req.user as User;
    const overlay = await requireBetOverlay(user.id);

    return res.json(overlay).status(200);
  });

  route.patch('/', reuqireAuthorization, async (req: Request, res: Response) => {
    const user = req.user as User;
    await patchBetOverlay(user.id, req.body);
    return res.json(undefined).status(204);
  });
};
