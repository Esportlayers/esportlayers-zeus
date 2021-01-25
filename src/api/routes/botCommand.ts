import { Router, Request, Response } from "express";
import { requireAuthorization } from "../../middleware/requireAuthorization";
import {User} from '@streamdota/shared-types';
import { getUserCommands, createUserCommand, patchCommand, deleteCommand } from "../../services/entity/Command";

const route = Router();

export default (app: Router) => {
    app.use('/command', route);

    route.get('/list', requireAuthorization, async(req: Request, res: Response) => {
        const user = req.user as User;
        const commands = await getUserCommands(user.id);
        return res.json(commands).status(200);
    });

    route.post('/create', requireAuthorization, async(req: Request, res: Response) => {
        const user = req.user as User;
        await createUserCommand(user.id, req.body.active, req.body.command, req.body.message, req.body.type);
        return res.sendStatus(201);
    });

    route.patch('/:commandId', requireAuthorization, async(req: Request, res: Response) => {
        const user = req.user as User;
        await patchCommand(+req.params.commandId, user.id, req.body);
        return res.sendStatus(204);
    });

    route.delete('/:commandId', requireAuthorization, async(req: Request, res: Response) => {
        const user = req.user as User;
        await deleteCommand(+req.params.commandId, user.id);
        return res.sendStatus(204);
    });
}