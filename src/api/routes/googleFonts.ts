import { Router, Request, Response } from 'express';
import { reuqireAuthorization } from '../../middleware/requireAuthorization';
import { getGoogleFonts } from '../../services/googleFonts';

const route = Router();

export default (app: Router) => {
    app.use('/googleFonts', route);

    route.get('/', reuqireAuthorization, async (req: Request, res: Response) => {
        const fonts = await getGoogleFonts();
        return res.json(fonts).status(200);
    });
};
