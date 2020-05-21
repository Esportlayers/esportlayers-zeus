import { ChatUserstate } from "tmi.js";
import { createBetRound, createBet, getRoundId, patchBetRound } from "../entity/BetRound";
import { User, Command } from "../../@types/Entities/User";
import { sendMessage } from "../websocket";
import { getUserCommands } from "../entity/Command";
import { publish } from "../twitchChat";
import { seasonTopList, getUserSeasonStats } from "../entity/BetSeasons";
import { CurrentBetRound, requireUser, requireBettingRound, startBet } from "./state";

const userCommandCache = new Map<string, Command[]>();

export async function requireUserCommands(channel: string, userId: number): Promise<Command[]> {
    if(!userCommandCache.has(channel.toLowerCase())) {
        const commands = await getUserCommands(userId);
        userCommandCache.set(channel.toLowerCase(), commands.filter(({type}) => type === 'betting_user' || type === 'betting_streamer'));
    }

    return userCommandCache.get(channel.toLowerCase())!;
}

export function clearBettingCommandsCache(channel: string): void {
	if(userCommandCache.has(channel.toLowerCase())) {
		userCommandCache.delete(channel.toLowerCase());
	}
}

async function replaceBetPlaceholder(msg: string, userName: string, seasonId: number): Promise<string> {
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

async function handleStaticCommands(channel: string, message: string, user: User, userName: string): Promise<boolean> {
    const userCommands = await requireUserCommands(channel, user.id);
    const nonFixed = userCommands.filter(({active, identifier}) => !identifier && active)
    .reduce<{[x: string]: string}>((acc, {command, message}) => ({...acc, [command.toLowerCase()]: message}), {});
    if(nonFixed[message.toLowerCase()] && user.betSeasonId) {
        publish(channel, await replaceBetPlaceholder(nonFixed[message], userName, user.betSeasonId));
        return true;
    }

    return false;
}

export async function getBettingCommands(userId: number, channel: string): Promise<{startBet: Command, bet: Command, winner: Command}> {
    const userCommands = await requireUserCommands(channel, userId);
    const startBet = userCommands?.find(({identifier}) => identifier === 'startbet')!;
    const bet = userCommands?.find(({identifier}) => identifier === 'bet')!;
    const winner = userCommands?.find(({identifier}) => identifier === 'betwinner')!;

    return {startBet, bet, winner};
}

async function handleUserBet(message: string, betCommand: Command, tags: ChatUserstate, currentRound: CurrentBetRound, userId: number): Promise<void> {
    const bet = message.substr(betCommand.command.length + 1, 1).toLowerCase();
    await createBet(userId, +tags["user-id"]!, tags["display-name"]!, tags.username!, bet);
    if(bet === 'a') {
        currentRound.bets = currentRound.bets + 1;
        currentRound.aBets = currentRound.aBets + 1;
        currentRound.betters.push(tags.username!);
        sendMessage(userId, 'betting', currentRound);
    } else if(bet === 'b') {
        currentRound.bets = currentRound.bets + 1;
        currentRound.bBets = currentRound.bBets + 1;
        currentRound.betters.push(tags.username!);
        sendMessage(userId, 'betting', currentRound);
    }
}

export async function processCommands(channel: string, tags: ChatUserstate, message: string): Promise<void> {
    const user = await requireUser(channel);

    if(! user?.useBets) {
        return;
    }

    const isStatic = await handleStaticCommands(channel, message, user, tags.username!);
    if(isStatic) {
        return;
    }

    const {startBet: startBetCommand, bet: betCommand, winner: winnerCommand} = await getBettingCommands(user.id, channel);

    if(!startBetCommand || !betCommand || !winnerCommand) {
        return;
    }

    if(message !== startBetCommand.command && !message.startsWith(betCommand.command) && !message.startsWith(winnerCommand.command)) {
        return;
    }

    const currentRound = await requireBettingRound(channel, user.id);

    if(message === startBetCommand.command && startBetCommand.active && (tags.badges?.broadcaster || tags.username === 'griefcode') && currentRound.status === 'finished' ) {
        await startBet(channel, user.id);
        await createBetRound(user.id, user.betSeasonId);
        sendMessage(user.id, 'betting', currentRound);
    } else if(message.startsWith(winnerCommand.command || '') && winnerCommand.command.length + 2 === message.length && winnerCommand.active && (tags.badges?.broadcaster || tags.username === 'griefcode') && currentRound.status === 'running' ) {
        const result = message.substr(winnerCommand.command.length + 1, 1).toLowerCase();
        const betRoundId = await getRoundId(user.id);
        await patchBetRound(betRoundId, {result, status: 'finished'}, true, user.id);
    } else if(message.startsWith(betCommand.command || '') && betCommand.active &&  betCommand.command.length + 2 === message.length && currentRound.status === 'betting' &&! currentRound.betters.includes(tags.username!)) {
        await handleUserBet(message, betCommand, tags, currentRound, user.id);
	}
}