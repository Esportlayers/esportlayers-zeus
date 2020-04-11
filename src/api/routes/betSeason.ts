import { Router, Request, Response } from 'express';
import { reuqireAuthorization } from '../../middleware/requireAuthorization';
import { User } from '../../@types/Entities/User';
import { getUserBetSeasons, createUserBetSeason, patchUserBetSeason, deleteUserBetSeason, createSeasonInvite, acceptSeasonInvite, denySeasonInvite, deleteInviteByKey, patchUserBetSeasonRole, deleteBetSeason, listInvites, listUsers } from '../../services/entity/BetSeasons';
import { requireBetSeasonAccess } from '../../middleware/requireBetSeasonAccess';
const route = Router();

export default (app: Router) => {
  app.use('/betSeason', route);

  route.get('/', reuqireAuthorization, async (req: Request, res: Response) => {
      const seasons = await getUserBetSeasons((req.user as User).id);
    return res.json(seasons).status(200);
  });

  route.post('/', reuqireAuthorization, async (req: Request, res: Response) => {
    await createUserBetSeason((req.user as User).id, req.body);
    return res.json(undefined).status(201);
  });

  route.get('/invites/:seasonId', reuqireAuthorization, requireBetSeasonAccess('owner'), async (req: Request, res: Response) => {
    const invites = await listInvites(+req.params.seasonId);
    return res.json(invites).status(204);
  });

  route.get('/users/:seasonId', reuqireAuthorization, requireBetSeasonAccess('owner'), async (req: Request, res: Response) => {
    const users = await listUsers(+req.params.seasonId);
    return res.json(users).status(204);
  });

  route.post('/invite/create/:seasonId', reuqireAuthorization, requireBetSeasonAccess('owner'), async (req: Request, res: Response) => {
    const key = await createSeasonInvite(+req.params.seasonId, (req.user as User).id);
    return res.json({key}).status(204);
  });

  route.post('/invite/accept/:inviteKey', reuqireAuthorization, async (req: Request, res: Response) => {
    await acceptSeasonInvite(req.params.inviteKey, (req.user as User).id);
    return res.json(undefined).status(204);
  });

  route.post('/invite/reject/:inviteKey', reuqireAuthorization, async (req: Request, res: Response) => {
    await denySeasonInvite(req.params.inviteKey, (req.user as User).id);
    return res.json(undefined).status(204);
  });

  route.delete('/invite/:seasonId/:inviteKey', reuqireAuthorization, requireBetSeasonAccess('owner'), async (req: Request, res: Response) => {
    await deleteInviteByKey(req.params.inviteKey, +req.params.seasonId, (req.user as User).id);
    return res.json(undefined).status(204);
  });

  route.patch('/:seasonId', reuqireAuthorization, requireBetSeasonAccess('editor'), async (req: Request, res: Response) => {
    await patchUserBetSeason(+req.params.seasonId, req.body);
    return res.json(undefined).status(204);
  });

  route.patch('/:seasonId/:userId', reuqireAuthorization, requireBetSeasonAccess('owner'), async (req: Request, res: Response) => {
    if((req.user as User).id !== +req.params.userId) {
      await patchUserBetSeasonRole(+req.params.seasonId, +req.params.userId, req.body.userRole);
    }
    return res.json(undefined).status(204);
  });

  route.delete('/:seasonId', reuqireAuthorization, requireBetSeasonAccess('owner'), async (req: Request, res: Response) => {
    await deleteBetSeason(+req.params.seasonId);
    return res.json(undefined).status(204);
  });

  route.delete('/:seasonId/:userId', reuqireAuthorization, requireBetSeasonAccess('owner'), async (req: Request, res: Response) => {
    if((req.user as User).id !== +req.params.userId) {
      await deleteUserBetSeason(+req.params.seasonId, +req.params.userId);
    }
    return res.json(undefined).status(204);
  });
};
