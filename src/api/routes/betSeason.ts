import { Router, Request, Response } from 'express';
import { requireAuthorization } from '../../middleware/requireAuthorization';
import {User} from '@streamdota/shared-types';
import { getUserBetSeasons, createUserBetSeason, patchUserBetSeason, deleteUserBetSeason, createSeasonInvite, acceptSeasonInvite, denySeasonInvite, deleteInviteByKey, patchUserBetSeasonRole, deleteBetSeason, listInvites, listUsers, seasonTopList, seasonStats } from '../../services/entity/BetSeasons';
import { requireBetSeasonAccess } from '../../middleware/requireBetSeasonAccess';
import { getBetSeasonRounds } from '../../services/entity/BetRound';
import { checkUserFrameAPIKey } from '../../middleware/frameApi';
const route = Router();

export default (app: Router) => {
  app.use('/betSeason', route);

  route.get('/', requireAuthorization, async (req: Request, res: Response) => {
      const seasons = await getUserBetSeasons((req.user as User).id);
    return res.json(seasons).status(200);
  });

  route.post('/', requireAuthorization, async (req: Request, res: Response) => {
    await createUserBetSeason((req.user as User).id, req.body);
    return res.sendStatus(201);
  });
  
  route.get('/rounds/:seasonId', requireAuthorization, requireBetSeasonAccess('user'), async (req: Request, res: Response) => {
    const rounds = await getBetSeasonRounds(+req.params.seasonId);
    return res.json(rounds).status(200);
  });

  route.get('/invites/:seasonId', requireAuthorization, requireBetSeasonAccess('owner'), async (req: Request, res: Response) => {
    const invites = await listInvites(+req.params.seasonId);
    return res.json(invites).status(200);
  });

  route.get('/users/:seasonId', requireAuthorization, requireBetSeasonAccess('user'), async (req: Request, res: Response) => {
    const users = await listUsers(+req.params.seasonId);
    return res.json(users).status(200);
  });

  route.get('/toplist/:seasonId', checkUserFrameAPIKey, requireAuthorization, requireBetSeasonAccess('user'), async (req: Request, res: Response) => {
    const toplist = await seasonTopList(+req.params.seasonId);
    return res.json(toplist).status(200);
  });

  route.post('/invite/create/:seasonId', requireAuthorization, requireBetSeasonAccess('owner'), async (req: Request, res: Response) => {
    const key = await createSeasonInvite(+req.params.seasonId, (req.user as User).id);
    return res.json({key}).status(200);
  });

  route.post('/invite/accept/:inviteKey', requireAuthorization, async (req: Request, res: Response) => {
    await acceptSeasonInvite(req.params.inviteKey, (req.user as User).id);
    return res.sendStatus(204);
  });

  route.post('/invite/reject/:inviteKey', requireAuthorization, async (req: Request, res: Response) => {
    await denySeasonInvite(req.params.inviteKey, (req.user as User).id);
    return res.sendStatus(204);
  });

  route.delete('/invite/:seasonId/:inviteKey', requireAuthorization, requireBetSeasonAccess('owner'), async (req: Request, res: Response) => {
    await deleteInviteByKey(req.params.inviteKey, +req.params.seasonId, (req.user as User).id);
    return res.sendStatus(204);
  });

  route.patch('/:seasonId', requireAuthorization, requireBetSeasonAccess('owner'), async (req: Request, res: Response) => {
    await patchUserBetSeason(+req.params.seasonId, req.body);
    return res.sendStatus(204);
  });

  route.patch('/:seasonId/:userId', requireAuthorization, requireBetSeasonAccess('owner'), async (req: Request, res: Response) => {
    if((req.user as User).id !== +req.params.userId) {
      await patchUserBetSeasonRole(+req.params.seasonId, +req.params.userId, req.body.userRole);
    }
    return res.sendStatus(204);
  });

  route.delete('/:seasonId', requireAuthorization, requireBetSeasonAccess('owner'), async (req: Request, res: Response) => {
    await deleteBetSeason(+req.params.seasonId, +(req.user as User).id);
    return res.sendStatus(204);
  });

  route.delete('/:seasonId/:userId', requireAuthorization, requireBetSeasonAccess('owner'), async (req: Request, res: Response) => {
    if((req.user as User).id !== +req.params.userId) {
      await deleteUserBetSeason(+req.params.seasonId, +req.params.userId);
    }
    return res.sendStatus(204);
  });

  route.get('/:seasonId/stats', requireAuthorization, requireBetSeasonAccess('owner'), async (req: Request, res: Response) => {
    const stats = await seasonStats(+req.params.seasonId);
    return res.json(stats).status(200);
  });
};
