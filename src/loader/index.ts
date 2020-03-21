import express from 'express';
import expressLoader from './express';
import twitchOAuthLoader from './passportTwitchOAuth';
import jwtVerify from './passportJWTVerify';
import anonymous from './passportAnonymous';

import {cyan} from 'chalk';
import { PassportStatic } from 'passport';

export default async ({ app, passport }: {app: express.Application, passport: PassportStatic}) => {
    await expressLoader({ app, passport});
    console.info(cyan('🔌 Express loaded'));

    await twitchOAuthLoader({ app, passport });
    console.info(cyan('🔒 Twitch OAuth registered'));

    await jwtVerify({passport});
    console.info(cyan('🔑 JWT authorization registered'));

    await anonymous({passport});
    console.info(cyan('🕵️  Anonymous users plugin registered'));

};
