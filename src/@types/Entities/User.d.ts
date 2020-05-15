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
    useBets: boolean;
    betSeasonId: number | null;
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
    active: boolean;
    command: string;
    message: string;
    type: 'default' | 'dotaWL' | 'betting_streamer' | 'betting_user';
    identifier: 'startbet' | 'bet' | 'betwinner';
}
export interface Timer {
    period: number;
    message: string;
    active: boolean;
}