import { Request, Response, Router } from "express";

import { User } from "@streamdota/shared-types";
import { getUserScopes } from "../../services/entity/Scopes";
import { requireAuthorization } from "../../middleware/requireAuthorization";

const route = Router();

export default (app: Router) => {
  app.use("/scopes", route);

  route.get("/", requireAuthorization, async (req: Request, res: Response) => {
    const scopes = await getUserScopes((req.user as User).id);
    return res.json(scopes).status(200);
  });
};
