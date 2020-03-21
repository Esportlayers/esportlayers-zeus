import {PassportStatic} from 'passport';
import {Strategy as AnonymousStrategy} from 'passport-anonymous';

export default async ({passport}: {passport: PassportStatic}) => {
    passport.use(new AnonymousStrategy());  
};