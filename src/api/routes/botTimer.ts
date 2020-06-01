import { Router, Request, Response } from "express";
import { reuqireAuthorization } from "../../middleware/requireAuthorization";
import {User} from '@streamdota/shared-types';
import { getUserTimer, createTimer, patchTimer, deleteTimer } from "../../services/entity/Timer";

const route = Router();

export default (app: Router) => {
    app.use('/timer', route);

    route.get('/list', reuqireAuthorization, async(req: Request, res: Response) => {
        const user = req.user as User;
        const timers = await getUserTimer(user.id);
        return res.json(timers).status(200);
    });

    route.post('/create', reuqireAuthorization, async(req: Request, res: Response) => {
        const user = req.user as User;
        await createTimer(user.id, req.body.active, +req.body.period, req.body.message);
        return res.json(undefined).status(200);
    });

    route.patch('/:timerId', reuqireAuthorization, async(req: Request, res: Response) => {
        const user = req.user as User;
        await patchTimer(+req.params.timerId, user.id, req.body.active, +req.body.period, req.body.message);
        return res.json(undefined).status(200);
    });

    route.delete('/:timerId', reuqireAuthorization, async(req: Request, res: Response) => {
        const user = req.user as User;
        await deleteTimer(+req.params.timerId, user.id);
        return res.json(undefined).status(200);
    });
}