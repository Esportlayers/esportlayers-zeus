export interface BetRound {
    id: number;
    betSeason: number;
    round: number;
    status: string;
    result: string;
    userId: number;
}


export interface BetRoundStats extends Omit<BetRound, 'betSeason'> {
    total: number;
    aBets: number;
    bBets: number;
}