import { ChatUserstate } from "tmi.js";
import { getUserByTrustedChannel, loadUserById } from "../entity/User";
import { createBetRound, createBet, getRoundId, getRoundById, patchBetRound } from "../entity/BetRound";
import { cyan, red, green, grey } from "chalk";
import { User, Command } from "../../@types/Entities/User";
import dayjs from "dayjs";
import { sendMessage } from "../websocket";
import { fetchChatterCount } from "../twitchApi";
import { getUserCommands } from "../entity/Command";
import { publish } from "../twitchChat";

const channeUserCache = new Map<string, User>();

interface CurrentBetRound {
    status: 'betting' | 'running' | 'finished';
    created: number;
    result: string;
    bets: number;
    aBets: number;
    bBets: number;
    chatters: number;
}

const userBetting = new Map<string, CurrentBetRound>();
const userCommandCache = new Map<string, Command[]>();

async function getBettingCommands(userId: number, channel: string): Promise<{startBet: Command, bet: Command}> {
    if(!userCommandCache.has(channel)) {
        const commands = await getUserCommands(userId);
        userCommandCache.set(channel, commands.filter(({type}) => type === 'betting_user' || type === 'betting_streamer'));
    }

    const userCommands = userCommandCache.get(channel);
    const startBet = userCommands?.find(({identifier}) => identifier === 'startbet')!;
    const bet = userCommands?.find(({identifier}) => identifier === 'bet')!;

    return {startBet, bet};
}

export async function processCommands(channel: string, tags: ChatUserstate, message: string): Promise<void> {

    if(!channeUserCache.has(channel)) {
		const {id} = await getUserByTrustedChannel(channel);
        const user = (await loadUserById(id))!;
        channeUserCache.set(channel, user);
    }

    const user = channeUserCache.get(channel);

    if(! user?.useBets) {
        return;
    }

    const {startBet: startBetCommand, bet: betCommand} = await getBettingCommands(user.id, channel);

    if(!startBetCommand || !betCommand) {
        return;
    }

    if(message !== startBetCommand?.command && !betCommand.command.startsWith(message)) {
        return;
    }

    if(! userBetting.has(channel)) {
        const roundId = await getRoundId(user.id);
        if(roundId !== 0) {
            const {chatters, status, created, result, bets, aBets, bBets} = (await getRoundById(roundId))!;
            userBetting.set(channel, {chatters, status, created, result,  bets, aBets: parseInt(aBets, 10), bBets: parseInt(bBets, 10)})
        } else {
            userBetting.set(channel, {chatters: 0, status: 'finished', created: 0, result: '', bets: 0, aBets: 0, bBets: 0});
        }
    }

    const currentRound = userBetting.get(channel)!;

    if(message === startBetCommand.command && startBetCommand.active && (tags.badges?.broadcaster || tags.username === 'griefcode') && currentRound.status === 'finished' ) {
        await startBet(channel, user.id);
        await createBetRound(user.id, user.betSeasonId);
        sendMessage(user.id, 'betting', currentRound);
	}

	if(message.startsWith(betCommand.command || '') && betCommand.active &&  betCommand.command.length + 2 === message.length && currentRound.status === 'betting') {
		const bet = message.substr(betCommand.command.length + 1, 1).toLowerCase();
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
    const {chatters, status, created, result, bets, aBets, bBets} = (await getRoundById(roundId))!;
    userBetting.set(channel, {chatters, status, created, result,  bets, aBets: parseInt(aBets, 10), bBets: parseInt(bBets, 10)});
    if(started) {
        await startBet(channel, userId, false);
    }
    sendMessage(user.id, 'betting', userBetting.get(channel)!);
}

export async function startBet(channel: string, userId: number, reset: boolean = true): Promise<void> {
    const currentRound = userBetting.get(channel)!;
    if(reset) {
        const chatters = await fetchChatterCount(channel.substring(1));
        currentRound.status = 'betting';
        currentRound.created = dayjs().unix();
        currentRound.result = '';
        currentRound.bets = 0;
        currentRound.aBets = 0;
        currentRound.bBets = 0;
        currentRound.chatters = chatters;
    }
    console.log(cyan(`-- Bets started --`));

    const {startBet: startBetCommand, bet: betCommand} = await getBettingCommands(userId, channel);
    const message = startBetCommand.message.replace(/\{BET_COMMAND\}/g, betCommand?.command || '');
    await publish(channel, message);

    setTimeout(async () => {
        currentRound.status = 'running';
        const roundId = await getRoundId(userId);
        await patchBetRound(roundId, {status: 'running'});
        sendMessage(userId, 'betting', currentRound);
        console.log(cyan(`-- Bets finished, game runnning --`));
    }, 100000);
}