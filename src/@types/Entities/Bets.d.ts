export enum BetType {
    ladder = 'ladder',
    tournament = 'tournament',
    other = 'other'
}

export enum UserRole {
    owner = 'owner',
    editor = 'editor',
    user = 'user'
}

export enum BetSeasonInviteStatus {
    open = 'open',
    accepted = 'accepted',
    denied = 'denied'
}

export enum BetRoundStatus {
  betting = 'betting',
  running = 'running',
  finished = 'finished'
}

export interface BetSeason {
    id: number;
    name: string;
    description: string;
    type: BetType;
}

export interface BetInvite {
    betSeason: BetSeason;
    owner: number;
    key: string;
    created: number;
    status: BetSeasonInviteStatus;
}