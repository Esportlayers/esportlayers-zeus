import { ChatUserstate } from "tmi.js";
import { getUserByTrustedChannel, loadUserById } from "../entity/User";
import { createBetRound, createBet, getRoundId, getRoundById, patchBetRound } from "../entity/BetRound";
import { cyan, red, green, grey } from "chalk";
import { User } from "../../@types/Entities/User";
import dayjs from "dayjs";
import { sendMessage } from "../websocket";


function isBetCommand(_channel: string, message: string): boolean {
    return message === '!startbet' || message.startsWith('!bet');
}

const channeUserCache = new Map<string, User>();

interface CurrentBetRound {
    status: 'betting' | 'running' | 'finished';
    created: number;
    result: string;
    bets: number;
    aBets: number;
    bBets: number;
}

const userBetting = new Map<string, CurrentBetRound>();

export async function processCommands(channel: string, tags: ChatUserstate, message: string): Promise<void> {
    if(! isBetCommand(channel, message)) {
        return;
    }

    if(!channeUserCache.has(channel)) {
		const {id} = await getUserByTrustedChannel(channel);
        const user = (await loadUserById(id))!;
        channeUserCache.set(channel, user);
    }

    const user = channeUserCache.get(channel);

    if(! user?.useBets) {
        return;
    }

    if(! userBetting.has(channel)) {
        const roundId = await getRoundId(user.id);
        if(roundId !== 0) {
            const {status, created, result, bets, aBets, bBets} = (await getRoundById(roundId))!;
            userBetting.set(channel, {status, created, result,  bets, aBets: parseInt(aBets, 10), bBets: parseInt(bBets, 10)})
        } else {
            userBetting.set(channel, {status: 'finished', created: 0, result: '', bets: 0, aBets: 0, bBets: 0});
        }
    }

    const currentRound = userBetting.get(channel)!;

    if(message === '!startbet' && tags.badges?.broadcaster && currentRound.status === 'finished') {
        startBet(channel, user.id);
        await createBetRound(user.id, user.betSeasonId);
        sendMessage(user.id, 'betting', currentRound);
	}

	if(message.startsWith('!bet') &&  message.length === 6 && currentRound.status === 'betting') {
		const bet = message.substr(5, 1).toLowerCase();
		await createBet(user.id, +tags["user-id"]!, tags["display-name"]!, tags.username!, bet);
		if(bet === 'a') {
            currentRound.bets = currentRound.bets + 1;
            currentRound.aBets = currentRound.aBets + 1;
            console.log(red(tags["display-name"]! + ' bets on A'));
            sendMessage(user.id, 'betting', currentRound);
		} else if(bet === 'b') {
            currentRound.bets = currentRound.bets + 1;
            currentRound.bBets = currentRound.bBets + 1;
			console.log(green(tags["display-name"]! + ' bets on B'));
            sendMessage(user.id, 'betting', currentRound);
		} else {
			console.log(grey(tags["display-name"]! + ' invalid bet on ' + bet));
		}
	}
}

export async function updateBetState(userId: number, started: boolean = false): Promise<void> {
    const user = (await loadUserById(userId))!;
    const channel = '#' + user.displayName;

    if(!channeUserCache.has(channel)) {
        channeUserCache.set(channel, user);
    }

    const roundId = await getRoundId(user.id);
    const {status, created, result, bets, aBets, bBets} = (await getRoundById(roundId))!;
    userBetting.set(channel, {status, created, result,  bets, aBets: parseInt(aBets, 10), bBets: parseInt(bBets, 10)});
    if(started) {
        startBet(channel, userId, false);
    }
    sendMessage(user.id, 'betting', userBetting.get(channel)!);
}

export async function startBet(channel: string, userId: number, reset: boolean = true): Promise<void> {
    const currentRound = userBetting.get(channel)!;
    if(true) {
        currentRound.status = 'betting';
        currentRound.created = dayjs().unix();
        currentRound.result = '';
        currentRound.bets = 0;
        currentRound.aBets = 0;
        currentRound.bBets = 0;
    }
    console.log(cyan(`-- Bets started --`))

    setTimeout(async () => {
        currentRound.status = 'running';
        const roundId = await getRoundId(userId);
        await patchBetRound(roundId, {status: 'running'});
        sendMessage(userId, 'betting', currentRound);
        console.log(cyan(`-- Bets finished, game runnning --`));
    }, 90000);
}