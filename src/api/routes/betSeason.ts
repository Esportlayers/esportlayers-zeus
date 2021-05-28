import { Request, Response, Router } from "express";
import {
  acceptSeasonInvite,
  createSeasonInvite,
  createUserBetSeason,
  deleteBetSeason,
  deleteInviteByKey,
  deleteUserBetSeason,
  denySeasonInvite,
  getProvablyFairList,
  getProvablyFairListWithoutWinner,
  getUserBetSeasons,
  getWinner,
  listInvites,
  listUsers,
  patchUserBetSeason,
  patchUserBetSeasonRole,
  seasonStats,
  seasonTopList,
} from "../../services/entity/BetSeasons";

import { User } from "@streamdota/shared-types";
import { checkUserFrameAPIKey } from "../../middleware/frameApi";
import { getBetSeasonRounds } from "../../services/entity/BetRound";
import { publish } from "../../services/twitchChat";
import { requireAuthorization } from "../../middleware/requireAuthorization";
import { requireBetSeasonAccess } from "../../middleware/requireBetSeasonAccess";
import spadille from "spadille";
import { v4 } from "uuid";

const route = Router();

export default (app: Router) => {
  app.use("/betSeason", route);

  route.get("/", requireAuthorization, async (req: Request, res: Response) => {
    const seasons = await getUserBetSeasons((req.user as User).id);
    return res.json(seasons).status(200);
  });

  route.post("/", requireAuthorization, async (req: Request, res: Response) => {
    await createUserBetSeason((req.user as User).id, req.body);
    return res.sendStatus(201);
  });

  route.get(
    "/rounds/:seasonId",
    requireAuthorization,
    requireBetSeasonAccess("user"),
    async (req: Request, res: Response) => {
      const rounds = await getBetSeasonRounds(+req.params.seasonId);
      return res.json(rounds).status(200);
    }
  );

  route.get(
    "/invites/:seasonId",
    requireAuthorization,
    requireBetSeasonAccess("owner"),
    async (req: Request, res: Response) => {
      const invites = await listInvites(+req.params.seasonId);
      return res.json(invites).status(200);
    }
  );

  route.get(
    "/users/:seasonId",
    requireAuthorization,
    requireBetSeasonAccess("user"),
    async (req: Request, res: Response) => {
      const users = await listUsers(+req.params.seasonId);
      return res.json(users).status(200);
    }
  );

  route.get(
    "/toplist/:seasonId",
    checkUserFrameAPIKey,
    requireAuthorization,
    requireBetSeasonAccess("user"),
    async (req: Request, res: Response) => {
      const toplist = await seasonTopList(+req.params.seasonId);
      return res.json(toplist).status(200);
    }
  );

  route.post(
    "/invite/create/:seasonId",
    requireAuthorization,
    requireBetSeasonAccess("owner"),
    async (req: Request, res: Response) => {
      const key = await createSeasonInvite(
        +req.params.seasonId,
        (req.user as User).id
      );
      return res.json({ key }).status(200);
    }
  );

  route.post(
    "/invite/accept/:inviteKey",
    requireAuthorization,
    async (req: Request, res: Response) => {
      await acceptSeasonInvite(req.params.inviteKey, (req.user as User).id);
      return res.sendStatus(204);
    }
  );

  route.post(
    "/invite/reject/:inviteKey",
    requireAuthorization,
    async (req: Request, res: Response) => {
      await denySeasonInvite(req.params.inviteKey, (req.user as User).id);
      return res.sendStatus(204);
    }
  );

  route.delete(
    "/invite/:seasonId/:inviteKey",
    requireAuthorization,
    requireBetSeasonAccess("owner"),
    async (req: Request, res: Response) => {
      await deleteInviteByKey(
        req.params.inviteKey,
        +req.params.seasonId,
        (req.user as User).id
      );
      return res.sendStatus(204);
    }
  );

  route.patch(
    "/:seasonId",
    requireAuthorization,
    requireBetSeasonAccess("owner"),
    async (req: Request, res: Response) => {
      await patchUserBetSeason(+req.params.seasonId, req.body);
      return res.sendStatus(204);
    }
  );

  route.patch(
    "/:seasonId/:userId",
    requireAuthorization,
    requireBetSeasonAccess("owner"),
    async (req: Request, res: Response) => {
      if ((req.user as User).id !== +req.params.userId) {
        await patchUserBetSeasonRole(
          +req.params.seasonId,
          +req.params.userId,
          req.body.userRole
        );
      }
      return res.sendStatus(204);
    }
  );

  route.delete(
    "/:seasonId",
    requireAuthorization,
    requireBetSeasonAccess("owner"),
    async (req: Request, res: Response) => {
      await deleteBetSeason(+req.params.seasonId, +(req.user as User).id);
      return res.sendStatus(204);
    }
  );

  route.delete(
    "/:seasonId/:userId",
    requireAuthorization,
    requireBetSeasonAccess("owner"),
    async (req: Request, res: Response) => {
      if ((req.user as User).id !== +req.params.userId) {
        await deleteUserBetSeason(+req.params.seasonId, +req.params.userId);
      }
      return res.sendStatus(204);
    }
  );

  route.get(
    "/:seasonId/stats",
    requireAuthorization,
    requireBetSeasonAccess("owner"),
    async (req: Request, res: Response) => {
      const stats = await seasonStats(+req.params.seasonId);
      return res.json(stats).status(200);
    }
  );

  route.get(
    "/:seasonId/provableWinner/:clientSeed",
    requireAuthorization,
    requireBetSeasonAccess("owner"),
    async (req: Request, res: Response) => {
      const list = await getProvablyFairList(+req.params.seasonId);
      const serverSeed = v4();
      const arbitrarySequence = await spadille.prng.generate({
        secret: serverSeed,
        payload: req.params.clientSeed,
        minimum: 0,
        maximum: list.length - 1,
        amount: 1,
        distinct: false,
      });

      const winnerEntry = arbitrarySequence[0];
      const winner = list[winnerEntry];

      setTimeout(async () => {
        await publish(
          "#" + (req.user as User).displayName.toLocaleLowerCase(),
          `Congratulations ${winner}! Verify winner on  fairplay.streamdota.com | Server seed: ${serverSeed} | Client seed: ${
            req.params.clientSeed
          } | Entries: ${list.length - 1} | Ticket: ${winnerEntry}`
        );
      }, (req.user as User).streamDelay * 1000);

      return res
        .json({
          serverSeed: serverSeed,
          count: list.length - 1,
          ticket: winnerEntry,
          winner,
        })
        .status(200);
    }
  );

  route.get(
    "/current/top3",
    checkUserFrameAPIKey,
    async (req: Request, res: Response) => {
      const top3 = await getWinner((req.user as User).betSeasonId!);
      return res.json(top3).status(200);
    }
  );

  route.get(
    "/current/randomWinner/:clientSeed",
    checkUserFrameAPIKey,
    async (req: Request, res: Response) => {
      const list = await getProvablyFairListWithoutWinner(
        (req.user as User).betSeasonId!
      );
      const serverSeed = v4();
      const arbitrarySequence = await spadille.prng.generate({
        secret: serverSeed,
        payload: req.params.clientSeed,
        minimum: 0,
        maximum: list.length - 1,
        amount: 1,
        distinct: false,
      });

      const winnerEntry = arbitrarySequence[0];
      const winner = list[winnerEntry];

      setTimeout(async () => {
        await publish(
          "#" + (req.user as User).displayName.toLocaleLowerCase(),
          `Congratulations ${winner}! Verify winner on  fairplay.streamdota.com | Server seed: ${serverSeed} | Client seed: ${
            req.params.clientSeed
          } | Entries: ${list.length - 1} | Ticket: ${winnerEntry}`
        );
      }, (req.user as User).streamDelay * 1000);

      return res
        .json({
          serverSeed: serverSeed,
          count: list.length,
          ticket: winnerEntry - 1,
          winner,
        })
        .status(200);
    }
  );
};
