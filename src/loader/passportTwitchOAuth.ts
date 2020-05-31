import express from 'express';
import {PassportStatic} from 'passport';
import {Strategy}  from 'passport-twitch-new';
import config from '../config';
import authRoutes from '../api/routes/auth';
import { findOrCreateUser } from '../services/entity/User';

export default async ({ app, passport }: { app: express.Application, passport: PassportStatic }) => {
    passport.use(new Strategy({
        callbackURL: config.twitch.callbackURL,
        clientID: config.twitch.clientId,
        clientSecret: config.twitch.clientSecret,
        scope: "",
        customHeaders: {
            'client-id': config.twitch.clientId,
        },
        
    },
    async (accessToken, refreshToken, profile, done) => {
        try {
            const user = await findOrCreateUser(+profile.id, profile.display_name, profile.profile_image_url);
            done(null, user);
        } catch(err) {
            done(err);
        }
    }
    ));

    passport.serializeUser(function(user, done) {
        done(null, user);
    });

    passport.deserializeUser(function(user, done) {
        done(null, user);
    });

    authRoutes(app, passport);
};
