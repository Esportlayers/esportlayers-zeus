import { PassportStatic } from "passport";
import { Router } from "express";
import antiSnipeRoutes from "./routes/antiSnipe";
import baseRoutes from "./routes/base";
import betOverlayRoute from "./routes/betsOverlay";
import betSeasonRoute from "./routes/betSeason";
import betsRoute from "./routes/bets";
import botCommandRoute from "./routes/botCommand";
import botTimerRoute from "./routes/botTimer";
import castingRoute from "./routes/casting";
import chatKeyWordRoutes from "./routes/chatKeyWords";
import dotaGsiRoutes from "./routes/dotaGsi";
import googleFontsRoute from "./routes/googleFonts";
import liveRoutes from "./routes/live";
import overlayRoute from "./routes/overlay";
import roshTimerRoutes from "./routes/roshTimer";
import scopesRoutes from "./routes/scopes";
import simulationRoutes from "./routes/simulate";
import userRoutes from "./routes/user";

export default ({ passport }: { passport: PassportStatic }) => {
  const app = Router();
  app.use(passport.authenticate(["jwt", "anonymous"], { session: false }));

  baseRoutes(app);
  userRoutes(app);
  dotaGsiRoutes(app);
  googleFontsRoute(app);
  overlayRoute(app);
  betsRoute(app);
  betSeasonRoute(app);
  botCommandRoute(app);
  botTimerRoute(app);
  betOverlayRoute(app);
  castingRoute(app);
  roshTimerRoutes(app);
  antiSnipeRoutes(app);
  liveRoutes(app);
  chatKeyWordRoutes(app);
  simulationRoutes(app);
  scopesRoutes(app);

  return app;
};
