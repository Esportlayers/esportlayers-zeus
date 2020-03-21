import { Router } from 'express';
import baseRoutes from './routes/base';

export default () => {
	const app = Router();
	baseRoutes(app);
	
	return app;
}
