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
import { seasonTopList, getUserSeasonStats } from "../entity/BetSeasons";

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

async function requireUserCommands(channel: string, userId: number): Promise<Command[]> {
    if(!userCommandCache.has(channel.toLowerCase())) {
        const commands = await getUserCommands(userId);
        userCommandCache.set(channel.toLowerCase(), commands.filter(({type}) => type === 'betting_user' || type === 'betting_streamer'));
    }

    return userCommandCache.get(channel.toLowerCase())!;
}

async function prepareBetMessage(msg: string, userName: string, seasonId: number): Promise<string> {
    let replacedMsg =  msg;
    const toplist = await seasonTopList(seasonId);
    const topListStats = toplist.slice(0, 5).map(({name, won, total}, idx) => `${idx + 1}. ${name} (${won}/${total})`).join('  ');
    const {won, total} = await getUserSeasonStats(userName, seasonId);
    const wrong = total > 0 ? total - won : 0;
    const accuracy = total > 0 ? Math.floor((won * 100) / total) : 0;
    replacedMsg = replacedMsg.replace(/\{USER\}/g, userName);
    replacedMsg = replacedMsg.replace(/\{TOPLIST_STATS\}/g, topListStats);
    replacedMsg = replacedMsg.replace(/\{USER_BETS_CORRECT\}/g, '' + won);
    replacedMsg = replacedMsg.replace(/\{USER_BETS_WRONG\}/g, '' + wrong);
    replacedMsg = replacedMsg.replace(/\{USER_BETS_TOTAL\}/g, '' + total);
    replacedMsg = replacedMsg.replace(/\{USER_BETS_ACCURACY\}/g, accuracy + '%');

    return replacedMsg;
}

async function checkForNonFixedCommands(channel: string, message: string, user: User, userName: string): Promise<boolean> {
    const userCommands = await requireUserCommands(channel, user.id);
    const nonFixed = userCommands.filter(({active, identifier}) => !identifier && active)
    .reduce<{[x: string]: string}>((acc, {command, message}) => ({...acc, [command.toLowerCase()]: message}), {});
    if(nonFixed[message.toLowerCase()] && user.betSeasonId) {
        publish(channel, await prepareBetMessage(nonFixed[message], userName, user.betSeasonId));
        return true;
    }

    return false;
}

async function getBettingCommands(userId: number, channel: string): Promise<{startBet: Command, bet: Command, winner: Command}> {
    const userCommands = await requireUserCommands(channel, userId);
    const startBet = userCommands?.find(({identifier}) => identifier === 'startbet')!;
    const bet = userCommands?.find(({identifier}) => identifier === 'bet')!;
    const winner = userCommands?.find(({identifier}) => identifier === 'betwinner')!;

    return {startBet, bet, winner};
}

export async function processCommands(channel: string, tags: ChatUserstate, message: string): Promise<void> {
    if(!channeUserCache.has(channel.toLowerCase())) {
		const {id} = await getUserByTrustedChannel(channel);
        const user = (await loadUserById(id))!;
        channeUserCache.set(channel.toLowerCase(), user);
    }

    const user = channeUserCache.get(channel.toLowerCase());

    if(! user?.useBets) {
        return;
    }

    const isNonFixed = await checkForNonFixedCommands(channel, message, user, tags.username!);
    if(isNonFixed) {
        return;
    }

    const {startBet: startBetCommand, bet: betCommand, winner: winnerCommand} = await getBettingCommands(user.id, channel);

    if(!startBetCommand || !betCommand || !winnerCommand) {
        return;
    }

    if(message !== startBetCommand.command && !message.startsWith(betCommand.command) && !message.startsWith(winnerCommand.command)) {
        return;
    }

    if(! userBetting.has(channel.toLowerCase())) {
        const roundId = await getRoundId(user.id);
        if(roundId !== 0) {
            const {chatters, status, created, result, bets, aBets, bBets} = (await getRoundById(roundId))!;
            userBetting.set(channel.toLowerCase(), {chatters, status, created, result,  bets, aBets: parseInt(aBets, 10), bBets: parseInt(bBets, 10)})
        } else {
            userBetting.set(channel.toLowerCase(), {chatters: 0, status: 'finished', created: 0, result: '', bets: 0, aBets: 0, bBets: 0});
        }
    }

    const currentRound = userBetting.get(channel.toLowerCase())!;

    if(message === startBetCommand.command && startBetCommand.active && (tags.badges?.broadcaster || tags.username === 'griefcode') && currentRound.status === 'finished' ) {
        await startBet(channel, user.id);
        await createBetRound(user.id, user.betSeasonId);
        sendMessage(user.id, 'betting', currentRound);
    } else if(message.startsWith(winnerCommand.command || '') && winnerCommand.command.length + 2 === message.length && winnerCommand.active && (tags.badges?.broadcaster || tags.username === 'griefcode') && currentRound.status === 'running' ) {
        const result = message.substr(winnerCommand.command.length + 1, 1).toLowerCase();
        const betRoundId = await getRoundId(user.id);
        await patchBetRound(betRoundId, {result, status: 'finished'}, true, user.id);
	} else if(message.startsWith(betCommand.command || '') && betCommand.active &&  betCommand.command.length + 2 === message.length && currentRound.status === 'betting') {
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

export async function updateBetState(userId: number, started: boolean = false, finished: boolean = false): Promise<void> {
    const user = (await loadUserById(userId))!;
    const channel = '#' + user.displayName;

    if(!channeUserCache.has(channel.toLowerCase())) {
        channeUserCache.set(channel.toLowerCase(), user);
    }

    const roundId = await getRoundId(user.id);
    const {chatters, status, created, result, bets, aBets, bBets} = (await getRoundById(roundId))!;
    userBetting.set(channel.toLowerCase(), {chatters, status, created, result,  bets, aBets: parseInt(aBets, 10), bBets: parseInt(bBets, 10)});
    if(started) {
        await startBet(channel, userId, false);
    }
    sendMessage(user.id, 'betting', userBetting.get(channel.toLowerCase())!);

    if(finished) {
        const {winner: winnerCommand} = await getBettingCommands(user.id, channel);
        const msg = winnerCommand.message.replace(/\{WINNER\}/g, result.toUpperCase());
        await publish(channel, msg);
    }
}

export async function startBet(channel: string, userId: number, reset: boolean = true): Promise<void> {
    const currentRound = userBetting.get(channel.toLowerCase())!;
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
    }, 90000);
}

export function clearBettingCommandsCache(channel: string): void {
	if(userCommandCache.has(channel.toLowerCase())) {
		userCommandCache.delete(channel.toLowerCase());
	}
}