import { NextFunction, Request, Response } from "express";
import { getUserByFrameApiKey, loadUserById } from "../services/entity/User";

import { User } from "@streamdota/shared-types";
import { getScopedUserByApiKey } from "../services/entity/Scopes";
import ws from "ws";

export async function checkUserFrameWebsocketApiKey(
  ws: ws,
  req: Request,
  next: NextFunction
) {
  const userData = await getUserByFrameApiKey(req.params.frameApiKey);

  let user: User | undefined = undefined;
  if (userData) {
    user = (await loadUserById(userData.id)) as User;
  }

  if (!user) {
    const scopedUserData = await getScopedUserByApiKey(req.params.frameApiKey);
    if (scopedUserData) {
      user = (await loadUserById(scopedUserData.id)) as User;
      //@ts-ignore
      ws.scopedUserId = scopedUserData.scopedUserId;
    }
  }

  req.user = user;
  //@ts-ignore
  ws.user = user;

  return next();
}

export async function checkUserFrameAPIKey(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (req.user) {
    return next();
  }

  const userData = await getUserByFrameApiKey(
    (req.params.frameApiKey as string) || (req.query.frameApiKey as string)
  );

  let user: User | undefined = undefined;
  if (userData) {
    user = (await loadUserById(userData.id)) as User;
  }
  req.user = user;

  return next();
}
