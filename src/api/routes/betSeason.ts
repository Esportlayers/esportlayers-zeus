import { Router, Request, Response } from 'express';
import { reuqireAuthorization } from '../../middleware/requireAuthorization';
import {User} from '@streamdota/shared-types';
import { getUserBetSeasons, createUserBetSeason, patchUserBetSeason, deleteUserBetSeason, createSeasonInvite, acceptSeasonInvite, denySeasonInvite, deleteInviteByKey, patchUserBetSeasonRole, deleteBetSeason, listInvites, listUsers, seasonTopList } from '../../services/entity/BetSeasons';
import { requireBetSeasonAccess } from '../../middleware/requireBetSeasonAccess';
import { getBetSeasonRounds } from '../../services/entity/BetRound';
import { checkUserFrameAPIKey } from '../../middleware/frameApi';
const route = Router();

export default (app: Router) => {
  app.use('/betSeason', route);

  route.get('/', reuqireAuthorization, async (req: Request, res: Response) => {
      const seasons = await getUserBetSeasons((req.user as User).id);
    return res.json(seasons).status(200);
  });

  route.post('/', reuqireAuthorization, async (req: Request, res: Response) => {
    await createUserBetSeason((req.user as User).id, req.body);
    return res.sendStatus(201);
  });

  route.get('/rounds/:seasonId', reuqireAuthorization, requireBetSeasonAccess('user'), async (req: Request, res: Response) => {
    const rounds = await getBetSeasonRounds(+req.params.seasonId);
    return res.json(rounds).status(200);
  });

  route.get('/invites/:seasonId', reuqireAuthorization, requireBetSeasonAccess('owner'), async (req: Request, res: Response) => {
    const invites = await listInvites(+req.params.seasonId);
    return res.json(invites).status(200);
  });

  route.get('/users/:seasonId', reuqireAuthorization, requireBetSeasonAccess('user'), async (req: Request, res: Response) => {
    const users = await listUsers(+req.params.seasonId);
    return res.json(users).status(200);
  });

  route.get('/toplist/:seasonId', checkUserFrameAPIKey, reuqireAuthorization, requireBetSeasonAccess('user'), async (req: Request, res: Response) => {
    const toplist = await seasonTopList(+req.params.seasonId);
    return res.json(toplist).status(200);
  });

  route.post('/invite/create/:seasonId', reuqireAuthorization, requireBetSeasonAccess('owner'), async (req: Request, res: Response) => {
    const key = await createSeasonInvite(+req.params.seasonId, (req.user as User).id);
    return res.json({key}).status(200);
  });

  route.post('/invite/accept/:inviteKey', reuqireAuthorization, async (req: Request, res: Response) => {
    await acceptSeasonInvite(req.params.inviteKey, (req.user as User).id);
    return res.sendStatus(204);
  });

  route.post('/invite/reject/:inviteKey', reuqireAuthorization, async (req: Request, res: Response) => {
    await denySeasonInvite(req.params.inviteKey, (req.user as User).id);
    return res.sendStatus(204);
  });

  route.delete('/invite/:seasonId/:inviteKey', reuqireAuthorization, requireBetSeasonAccess('owner'), async (req: Request, res: Response) => {
    await deleteInviteByKey(req.params.inviteKey, +req.params.seasonId, (req.user as User).id);
    return res.sendStatus(204);
  });

  route.patch('/:seasonId', reuqireAuthorization, requireBetSeasonAccess('owner'), async (req: Request, res: Response) => {
    await patchUserBetSeason(+req.params.seasonId, req.body);
    return res.sendStatus(204);
  });

  route.patch('/:seasonId/:userId', reuqireAuthorization, requireBetSeasonAccess('owner'), async (req: Request, res: Response) => {
    if((req.user as User).id !== +req.params.userId) {
      await patchUserBetSeasonRole(+req.params.seasonId, +req.params.userId, req.body.userRole);
    }
    return res.sendStatus(204);
  });

  route.delete('/:seasonId', reuqireAuthorization, requireBetSeasonAccess('owner'), async (req: Request, res: Response) => {
    await deleteBetSeason(+req.params.seasonId);
    return res.sendStatus(204);
  });

  route.delete('/:seasonId/:userId', reuqireAuthorization, requireBetSeasonAccess('owner'), async (req: Request, res: Response) => {
    if((req.user as User).id !== +req.params.userId) {
      await deleteUserBetSeason(+req.params.seasonId, +req.params.userId);
    }
    return res.sendStatus(204);
  });
};
