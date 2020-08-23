import { getRoundId, getRoundById, patchBetRound } from "../entity/BetRound";
import { getUserByTrustedChannel, loadUserById } from "../entity/User";
import {User} from '@streamdota/shared-types';
import { fetchChatterCount } from "../twitchApi";
import dayjs from "dayjs";
import { getBettingCommands } from "./chatCommands";
import { publish } from "../twitchChat";
import { sendMessage } from "../websocket";

export interface CurrentBetRound {
    id: number;
    status: 'betting' | 'running' | 'finished';
    created: number;
    result: string;
    total: number;
    aBets: number;
    bBets: number;
    chatters: number;
    betters: string[];
}

const channeUserCache = new Map<string, User>();
const userBetting = new Map<string, CurrentBetRound>();

export async function requireBettingRound(channel: string, userId: number): Promise<CurrentBetRound> {
    if(! userBetting.has(channel.toLowerCase())) {
        const roundId = await getRoundId(userId);
        if(roundId !== 0) {
            const {chatters, status, created, result, total, aBets, bBets} = (await getRoundById(roundId))!;
            userBetting.set(channel.toLowerCase(), {id: roundId, betters: [], chatters, status, created, result, total, aBets: parseInt(aBets, 10), bBets: parseInt(bBets, 10)})
        } else {
            userBetting.set(channel.toLowerCase(), {id: 0, betters: [], chatters: 0, status: 'finished', created: 0, result: '', total: 0, aBets: 0, bBets: 0});
        }
    }

    return userBetting.get(channel.toLowerCase())!;
}

export async function requireUser(channel: string): Promise<User> {
    const lowerChannel = channel.toLowerCase();
    if(!channeUserCache.has(lowerChannel)) {
        const {id} = await getUserByTrustedChannel(channel);
        const user = (await loadUserById(id))!;
        channeUserCache.set(lowerChannel, user);
    }

    return channeUserCache.get(lowerChannel)!;
}

export async function startBet(channel: string, userId: number, reset: boolean = true): Promise<void> {
    const currentRound = await requireBettingRound(channel, userId);
    if(reset) {
        const chatters = await fetchChatterCount(channel.substring(1));
        currentRound.status = 'betting';
        currentRound.created = dayjs().unix();
        currentRound.result = '';
        currentRound.total = 0;
        currentRound.aBets = 0;
        currentRound.bBets = 0;
        currentRound.chatters = chatters;
    }

    const {startBet: startBetCommand, bet: betCommand} = await getBettingCommands(channel);
    const message = startBetCommand.message.replace(/\{BET_COMMAND\}/g, betCommand?.command || '');
    await publish(channel, message);

    setTimeout(async () => {
        currentRound.status = 'running';
        const roundId = await getRoundId(userId);
        await patchBetRound(roundId, {status: 'running'});
        await publish(channel, 'Die Wetten sind geschlossen.');
        sendMessage(userId, 'betting', currentRound);
    }, 90000);
}

export async function updateBetState(userId: number, started: boolean = false, finished: boolean = false): Promise<void> {
    const user = (await loadUserById(userId))!;
    const channel = '#' + user.displayName;

    if(!channeUserCache.has(channel.toLowerCase())) {
        channeUserCache.set(channel.toLowerCase(), user);
    }

    const roundId = await getRoundId(user.id);
    const {chatters, status, created, result, total, aBets, bBets} = (await getRoundById(roundId))!;
    userBetting.set(channel.toLowerCase(), {id: roundId, betters: [], chatters, status, created, result,  total, aBets: parseInt(aBets, 10), bBets: parseInt(bBets, 10)});
    
    if(started) {
        await startBet(channel, userId, false);
    }
    
    sendMessage(user.id, 'betting', userBetting.get(channel.toLowerCase())!);

    if(finished) {
        const {winner: winnerCommand} = await getBettingCommands(channel);
        const msg = winnerCommand.message.replace(/\{WINNER\}/g, result.toUpperCase());
        await publish(channel, msg);
    }
}

export function clearBettingCache(channel: string): void {
    if(userBetting.has(channel)) {
        userBetting.delete(channel);
    }
}

export function clearUserCache(channel: string): void {
    if(channeUserCache.has(channel)) {
        channeUserCache.delete(channel);
    }
}