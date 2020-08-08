import { Router, Request, Response } from 'express';
import { reuqireAuthorization } from '../../middleware/requireAuthorization';
import {User} from '@streamdota/shared-types';
import { requireBetOverlay, patchBetOverlay } from '../../services/entity/BetOverlay';
import { checkUserFrameAPIKey } from '../../middleware/frameApi';

const route = Router();

export default (app: Router) => {
  app.use('/betsOverlay', route);

  route.get('/', checkUserFrameAPIKey, reuqireAuthorization, async (req: Request, res: Response) => {
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
