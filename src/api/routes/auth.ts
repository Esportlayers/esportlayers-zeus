import { Request, Response, Router } from "express";

import { PassportStatic } from "passport";
import { User } from "@streamdota/shared-types";
import config from "../../config";
import jsonwebtoken from "jsonwebtoken";

const route = Router();

export default (app: Router, passport: PassportStatic) => {
  app.use("/auth", route);
  route.get("/twitch", (req, res, next) => {
    const callbackURL = req.query.callbackURL;
    //@ts-ignore
    const auth = passport.authenticate("twitch-login", { callbackURL });
    auth(req, res, next);
  });
  route.get(
    "/twitch/callback",
    passport.authenticate("twitch-login", {
      failureRedirect: "/auth/twitch",
    }),
    (req: Request, res: Response) => {
      const user = req.user as User;
      const jwtToken = jsonwebtoken.sign(
        { sub: user.id, name: user.displayName },
        config.jwtSecret
      );
      res.setHeader("Content-Type", "text/html");
      return res.send(jwtToken).status(200);
    }
  );

  route.get("/twitchNew", (req, res, next) => {
    const callbackURL = req.query.callbackURL;
    //@ts-ignore
    const auth = passport.authenticate("twitch-login-new", { callbackURL });
    auth(req, res, next);
  });
  route.get(
    "/twitchNew/callback",
    passport.authenticate("twitch-login-new", {
      failureRedirect: "/auth/twitchNew",
    }),
    (req: Request, res: Response) => {
      const user = req.user as User;
      const jwtToken = jsonwebtoken.sign(
        { sub: user.id, name: user.displayName },
        config.jwtSecret
      );
      res.setHeader("Content-Type", "text/html");
      return res.send(jwtToken).status(200);
    }
  );

  route.get("/twitchPredictions", (req, res, next) => {
    const callbackURL = req.query.callbackURL;
    const auth = passport.authenticate("twitch-prediction-scope", {
      //@ts-ignore
      callbackURL,
    });
    auth(req, res, next);
  });

  route.get(
    "/twitchPredictions/callback",
    passport.authenticate("twitch-prediction-scope", {
      failureRedirect: "/auth/twitchPredictions",
    }),
    (req: Request, res: Response) => {
      return res.send(undefined).status(204);
    }
  );
};
