import { Router } from 'express';
import baseRoutes from './routes/base';
import userRoutes from './routes/user';
import dotaGsiRoutes from './routes/dotaGsi';
import googleFontsRoute from './routes/googleFonts';
import { PassportStatic } from 'passport';

export default ({passport}: {passport: PassportStatic}) => {
	const app = Router();
	app.use(passport.authenticate(['jwt', 'anonymous'], { session: false }));
	
	baseRoutes(app);
	userRoutes(app);
	dotaGsiRoutes(app);
	googleFontsRoute(app);
	
	return app;
}
