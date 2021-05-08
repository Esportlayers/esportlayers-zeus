import { NextFunction, Request, Response, Router } from "express";
import {
  checkUserFrameAPIKey,
  checkUserFrameWebsocketApiKey,
} from "../../middleware/frameApi";
import {
  createPrediction,
  resolvePrediction,
} from "../../services/twitchPredictionApi";

import { User } from "@streamdota/shared-types";
import config from "../../config";
import { fetchMatchDetails } from "../../services/steamWebApi";
import getOnlineStatus from "../../services/streamer";
import { getUserScopeAccess } from "../../services/entity/TwitchOAuthScopes";
import { heartbeat } from "../../tasks/websocketHeartbeat";
import { newGSIListener } from "../../middleware/gsiConnection";
import { requireAuthorization } from "../../middleware/requireAuthorization";
import { sendMessage } from "../../services/websocket";
import ws from "ws";

const route = Router();

function checkStreamerApiKey(req: Request, res: Response, next: NextFunction) {
  const key = (req.params.apiKey as string) || (req.query.apiKey as string);

  if (!key || key !== config.streamerApiKey) {
    return res.status(401).json({ msg: "Unauthorized" });
  }

  return next();
}

export default (app: Router) => {
  app.use("/live", route);

  route.get(
    "/matchDetails/:matchId",
    checkUserFrameAPIKey,
    requireAuthorization,
    async (req: Request, res: Response) => {
      const teamsData = await fetchMatchDetails(+req.params.matchId);
      if (teamsData) {
        return res.json({ id: +req.params.matchId, ...teamsData }).status(200);
      }
      return res
        .json({
          id: +req.params.matchId,
          radiant: {
            name: "Radiant",
            logo: null,
            wins: 0,
          },
          dire: {
            name: "Dire",
            logo: null,
            wins: 0,
          },
          seriesType: 1,
        })
        .status(200);
    }
  );

  route.post(
    "/keywordQuestion",
    requireAuthorization,
    async (req: Request, res: Response) => {
      sendMessage((req.user as User).id, "keyword_message_overlay", {
        ...req.body,
        keyword: (req.user as User).keywordListener,
      });

      return res.sendStatus(204);
    }
  );

  route.ws(
    "/scoped/:frameApiKey",
    checkUserFrameWebsocketApiKey,
    (conn: ws, req: Request, next: NextFunction) => {
      let scopes: string | string[] | undefined = req.query.scopes as
        | string
        | string[]
        | undefined;

      if (scopes && !(scopes instanceof Array)) {
        scopes = [scopes];
      }

      //@ts-ignore
      conn.scopes = new Set(scopes);
      //@ts-ignore
      conn.isAlive = true;
      conn.on("pong", heartbeat);

      next();
    },
    newGSIListener
  );

  route.get(
    "/streamer",
    checkStreamerApiKey,
    async (req: Request, res: Response) => {
      let streamer: string | string[] | undefined = req.query.streamer as
        | string
        | string[]
        | undefined;

      if (streamer && !(streamer instanceof Array)) {
        streamer = [streamer];
      }

      const data = await getOnlineStatus(streamer as string[]);
      return res.json(data).status(200);
    }
  );

  route.post(
    "/twitchPrediction",
    requireAuthorization,
    async (req: Request, res: Response) => {
      const user = req.user as User;
      const { accessToken, refreshToken } = (await getUserScopeAccess(
        user.id,
        "predictions"
      )) || { accessToken: "", refreshToken: "" };

      if (accessToken.length && refreshToken.length) {
        await createPrediction(user, accessToken, refreshToken);
        return res.json({}).status(200);
      }

      return res.json({}).status(409);
    }
  );

  route.patch(
    "/twitchPrediction",
    requireAuthorization,
    async (req: Request, res: Response) => {
      const user = req.user as User;
      const { accessToken, refreshToken } = (await getUserScopeAccess(
        user.id,
        "predictions"
      )) || { accessToken: "", refreshToken: "" };

      const { winnerA } = req.body;

      if (accessToken.length && refreshToken.length) {
        await resolvePrediction(
          user,
          accessToken,
          refreshToken,
          Boolean(winnerA)
        );
        return res.json({}).status(200);
      }

      return res.json({}).status(409);
    }
  );
};
