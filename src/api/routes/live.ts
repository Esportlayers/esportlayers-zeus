import { Request, Response, Router } from "express";

import { User } from "@streamdota/shared-types";
import { checkUserFrameWebsocketApiKey } from "../../middleware/frameApi";
import { fetchMatchTeams } from "../../services/steamWebApi";
import { heartbeat } from "../../tasks/websocketHeartbeat";
import { newGSIListener } from "../../middleware/gsiConnection";
import { requireAuthorization } from "../../middleware/requireAuthorization";
import { sendMessage } from "../../services/websocket";
import ws from "ws";

const route = Router();

export default (app: Router) => {
  app.use("/live", route);

  route.get(
    "/teams/:matchId",
    requireAuthorization,
    async (req: Request, res: Response) => {
      const teamsData = await fetchMatchTeams(+req.params.matchId);
      if (teamsData) {
        return res.json({ id: +req.params.matchId, ...teamsData }).status(200);
      }
      return res
        .json({
          id: +req.params.matchId,
          radiant: {
            name: "Radiant",
            logo: null,
          },
          dire: {
            name: "Dire",
            logo: null,
          },
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
    (conn: ws, req: Request) => {
      //@ts-ignore
      conn.scopes = new Set(req.query.scopes || []);
      //@ts-ignore
      conn.isAlive = true;
      conn.on("pong", heartbeat);
    },
    newGSIListener
  );
};
