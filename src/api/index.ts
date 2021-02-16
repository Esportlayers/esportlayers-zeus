import { Router } from 'express';
import baseRoutes from './routes/base';
import userRoutes from './routes/user';
import dotaGsiRoutes from './routes/dotaGsi';
import googleFontsRoute from './routes/googleFonts';
import overlayRoute from './routes/overlay';
import betsRoute from './routes/bets';
import betSeasonRoute from './routes/betSeason';
import botCommandRoute from './routes/botCommand';
import botTimerRoute from './routes/botTimer';
import betOverlayRoute from './routes/betsOverlay';
import castingRoute from './routes/casting';
import simulationRoutes from './routes/simulate';
import roshTimerRoutes from './routes/roshTimer';
import antiSnipeRoutes from './routes/antiSnipe';
import liveRoutes from './routes/live';
import chatKeyWordRoutes from './routes/chatKeyWords';
import { PassportStatic } from 'passport';

export default ({passport}: {passport: PassportStatic}) => {
	const app = Router();
	app.use(passport.authenticate(['jwt', 'anonymous'], { session: false }));
	
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

	return app;
}
