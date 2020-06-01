import { Router, Request, Response } from 'express';
import { reuqireAuthorization } from '../../middleware/requireAuthorization';
import { createBetRound, patchBetRound, deleteBetRound, getRoundId, getRoundById } from '../../services/entity/BetRound';
import {User} from '@streamdota/shared-types/Entities/User';
import { requireBetRoundAccess } from '../../middleware/requireBetSeasonAccess';
import { checkUserFrameWebsocketApiKey } from '../../middleware/frameApi';
import { heartbeat } from '../../tasks/websocketHeartbeat';
import ws from 'ws';

const route = Router();

export default (app: Router) => {
  app.use('/bets', route);

  route.get('/current', reuqireAuthorization, async (req: Request, res: Response) => {
    const user = req.user as User;
    const roundId = await getRoundId(user.id);
    const round = await getRoundById(roundId);
    return res.json(round).status(200);
  });

  route.post('/', reuqireAuthorization, async (req: Request, res: Response) => {
    const user = req.user as User;
    await createBetRound(user.id, user.betSeasonId, true);
    return res.json(undefined).status(201);
  });

  route.patch('/:roundId', reuqireAuthorization, requireBetRoundAccess('owner'), async (req: Request, res: Response) => {
    const user = req.user as User;
    await patchBetRound(+req.params.roundId, req.body, true, user.id);
    return res.json(undefined).status(204);
  });

  route.delete('/:roundId', reuqireAuthorization, requireBetRoundAccess('owner'), async (req: Request, res: Response) => {
    await deleteBetRound(+req.params.roundId);
    return res.json(undefined).status(204);
  });

  route.ws('/live/:frameApiKey', checkUserFrameWebsocketApiKey, (ws: ws, req: Request) => {
    //@ts-ignore
    ws.isAlive = true;
    ws.on('pong', heartbeat);
  });
};
