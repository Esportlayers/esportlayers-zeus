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
	
	return app;
}
