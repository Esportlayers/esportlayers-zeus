declare module 'passport-twitch-new' {
    import p from 'passport';

    interface Props {
        clientID: string;
        clientSecret: string;
        callbackURL: string;
        scope: string;
        authorizationURL?: string;
        tokenURL?: string;
        customHeaders: object;
    }


    export class Strategy<TUser> extends p.Strategy {
        constructor(
            props: Props, 
            verify: (accessToken: string, refreshToken: string, profile: any, done: (err: any, user?: TUser) => void) => void
        );
    }
}
