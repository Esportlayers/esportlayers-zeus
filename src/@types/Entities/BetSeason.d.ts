export interface BetSeason {
    id: number;
    name: string;
    description: string;
    type: 'ladder' | 'tournament' | 'other';
}

export interface BetInvite {
    betSeason: BetSeason;
    owner: number;
    key: string;
    created: number;
    status: 'open' | 'accepted' | 'denied';
}