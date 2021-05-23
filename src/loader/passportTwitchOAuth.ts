import { PassportStatic } from "passport";
import { Strategy } from "passport-twitch-new";
import authRoutes from "../api/routes/auth";
import config from "../config";
import express from "express";
import { findOrCreateUser } from "../services/entity/User";
import { putUserOAuthScope } from "../services/entity/TwitchOAuthScopes";

export default async ({
  app,
  passport,
}: {
  app: express.Application;
  passport: PassportStatic;
}) => {
  passport.use(
    "twitch-login",
    new Strategy(
      {
        callbackURL: config.twitch.callbackURL,
        clientID: config.twitch.clientId,
        clientSecret: config.twitch.clientSecret,
        scope: "",
        customHeaders: {
          "client-id": config.twitch.clientId,
        },
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const user = await findOrCreateUser(
            +profile.id,
            profile.display_name,
            profile.profile_image_url
          );
          if (user.status !== "active") {
            done("Account is disabled");
          } else {
            done(null, user);
          }
        } catch (err) {
          done(err);
        }
      }
    )
  );
  passport.use(
    "twitch-login-new",
    new Strategy(
      {
        callbackURL: config.twitch.callbackURLNew,
        clientID: config.twitch.clientId,
        clientSecret: config.twitch.clientSecret,
        scope: "",
        customHeaders: {
          "client-id": config.twitch.clientId,
        },
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const user = await findOrCreateUser(
            +profile.id,
            profile.display_name,
            profile.profile_image_url
          );
          if (user.status !== "active") {
            done("Account is disabled");
          } else {
            done(null, user);
          }
        } catch (err) {
          done(err);
        }
      }
    )
  );

  passport.use(
    "twitch-prediction-scope",
    new Strategy(
      {
        callbackURL: config.twitch.callbackPredictionsURL,
        clientID: config.twitch.clientId,
        clientSecret: config.twitch.clientSecret,
        scope: "channel:read:predictions channel:manage:predictions",
        customHeaders: {
          "client-id": config.twitch.clientId,
        },
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const user = await findOrCreateUser(
            +profile.id,
            profile.display_name,
            profile.profile_image_url
          );
          await putUserOAuthScope(
            user.id,
            "predictions",
            accessToken,
            refreshToken
          );
          done(null, user);
        } catch (err) {
          done(err);
        }
      }
    )
  );

  passport.serializeUser(function (user, done) {
    done(null, user);
  });

  passport.deserializeUser(function (user, done) {
    //@ts-ignore
    done(null, user);
  });

  authRoutes(app, passport);
};
