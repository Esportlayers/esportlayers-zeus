import { loadUserById } from '../services/entity/User';
import { PassportStatic } from 'passport';
import {Strategy, ExtractJwt, StrategyOptions} from 'passport-jwt';
import config from '../config';

export default async ({passport}: {passport: PassportStatic}) => {
    var opts: StrategyOptions = {
        jwtFromRequest: ExtractJwt.fromAuthHeaderWithScheme('JWT'),
        secretOrKey: config.jwtSecret,
    };

    passport.use(new Strategy(opts, async (jwt_payload, done) => {
        try {
            const user = await loadUserById(jwt_payload.sub);
            return done(null, user)
        } catch(error) {
            return done(error, false);
        }
    }));
};
