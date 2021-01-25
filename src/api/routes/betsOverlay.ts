import { Router, Request, Response } from 'express';
import { requireAuthorization } from '../../middleware/requireAuthorization';
import {User} from '@streamdota/shared-types';
import { requireBetOverlay, patchBetOverlay } from '../../services/entity/BetOverlay';
import { checkUserFrameAPIKey } from '../../middleware/frameApi';
import { sendMessage } from '../../services/websocket';
import { getUserCommands } from '../../services/entity/Command';

const route = Router();

export default (app: Router) => {
  app.use('/betsOverlay', route);

  route.get('/', checkUserFrameAPIKey, requireAuthorization, async (req: Request, res: Response) => {
    const user = req.user as User;
    const overlay = await requireBetOverlay(user.id);

    return res.json(overlay).status(200);
  });

  route.get('/bettingCommand', checkUserFrameAPIKey, requireAuthorization, async (req: Request, res: Response) => {
    const user = req.user as User;
    const commands = await getUserCommands(user.id);
    const betCommand = commands.find(({identifier}) => identifier === 'bet');
    return res.json({command: betCommand?.command}).status(200);
  });

  route.patch('/', requireAuthorization, async (req: Request, res: Response) => {
    const user = req.user as User;
    await patchBetOverlay(user.id, req.body);
    sendMessage((req.user as User).id, 'overlay', true);
    return res.sendStatus(204);
  });
};
