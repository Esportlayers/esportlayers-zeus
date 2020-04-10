export interface User {
    id: number;
    twitchId: number;
    displayName: string;
    created: number;
    avatar: string;
    avatarWEBP: string;
    avatarJP2: string;
    profileUrl: string;
    gsiAuth: string;
    dotaStatsFrom: string;
}

export interface SteamConnection {
    id: number;
    userId: number;
    steamId: string;
}

export interface BotData {
    useBot: boolean;
    customBotName: string;
    customBotToken: string;
    commandTrigger: string;
}

export interface Command {
    command: string;
    message: string;
}