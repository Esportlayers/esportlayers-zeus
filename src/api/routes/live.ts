import { NextFunction, Request, Response, Router } from "express";
import {
  checkUserFrameAPIKey,
  checkUserFrameWebsocketApiKey,
} from "../../middleware/frameApi";

import { User } from "@streamdota/shared-types";
import { fetchMatchDetails } from "../../services/steamWebApi";
import { heartbeat } from "../../tasks/websocketHeartbeat";
import { newGSIListener } from "../../middleware/gsiConnection";
import { requireAuthorization } from "../../middleware/requireAuthorization";
import { sendMessage } from "../../services/websocket";
import ws from "ws";

const route = Router();

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
};
