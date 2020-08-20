import { Router, Request, Response } from 'express';
import { reuqireAuthorization } from '../../middleware/requireAuthorization';
import { createBetRound, patchBetRound, deleteBetRound, getRoundId, getRoundById } from '../../services/entity/BetRound';
import {User} from '@streamdota/shared-types';
import { requireBetRoundAccess } from '../../middleware/requireBetSeasonAccess';
import { checkUserFrameWebsocketApiKey, checkUserFrameAPIKey } from '../../middleware/frameApi';
import { heartbeat } from '../../tasks/websocketHeartbeat';
import ws from 'ws';

const route = Router();

export default (app: Router) => {
  app.use('/bets', route);

  route.get('/current', checkUserFrameAPIKey, reuqireAuthorization, async (req: Request, res: Response) => {
    const user = req.user as User;
    const roundId = await getRoundId(user.id);
    const round = await getRoundById(roundId);
    return res.json(round).status(200);
  });

  route.post('/', reuqireAuthorization, async (req: Request, res: Response) => {
    const user = req.user as User;
    await createBetRound(user.id, user.betSeasonId, true);
    return res.sendStatus(201);
  });

  route.patch('/:roundId', reuqireAuthorization, requireBetRoundAccess('owner'), async (req: Request, res: Response) => {
    const user = req.user as User;
    await patchBetRound(+req.params.roundId, req.body, true, user.id);
    return res.sendStatus(204);
  });

  route.delete('/:roundId', reuqireAuthorization, requireBetRoundAccess('owner'), async (req: Request, res: Response) => {
    await deleteBetRound(+req.params.roundId);
    return res.sendStatus(204);
  });

  route.ws('/live/:frameApiKey', checkUserFrameWebsocketApiKey, (ws: ws, req: Request) => {
    //@ts-ignore
    ws.isAlive = true;
    ws.on('pong', heartbeat);
  });
};
