import { ChatUserstate } from "tmi.js";
import { publish, ChannelCommand, getCommandsCacheKey, hasAccess } from "../twitchChat";
import { seasonTopList, getUserSeasonStats } from "../entity/BetSeasons";
import {Command, User} from '@streamdota/shared-types';
import { getChannelCommands } from "../entity/User";
import { getObj, setObj } from "../../loader/redis";
import { initializeBet, registerBet, resolveBet, requireUser, BetRoundData, roundKey } from "./state";


export async function requireUserCommands(channel: string): Promise<ChannelCommand> {
	let betCommands = await getObj<ChannelCommand>(getCommandsCacheKey(channel, ['betting_user', 'betting_streamer']));

    if(!betCommands) {
        const commands = await getChannelCommands(channel.toLowerCase(), new Set(['betting_user', 'betting_streamer']));
		const mapped = commands.reduce<ChannelCommand>((acc, command) => {
			acc[command.command.toLowerCase()] = command;
			return acc;
		}, {});
		await setObj(getCommandsCacheKey(channel, ['betting_user', 'betting_streamer']), mapped);
		const commandKeys = commands.map(({command}) => command.toLowerCase());
		await setObj(getCommandsCacheKey(channel, ['betting_user', 'betting_streamer'], 'commands'), commandKeys);
		betCommands = mapped;
    }

    return betCommands;
}

export async function clearBettingCommandsCache(channel: string): Promise<void> {
	await setObj(getCommandsCacheKey(channel, ['betting_user', 'betting_streamer']), null);
	await setObj(getCommandsCacheKey(channel, ['betting_user', 'betting_streamer'], 'commands'), null);
}

export async function replaceBetPlaceholder(msg: string, userName: string, seasonId: number, teamA = 'a', teamB = 'b'): Promise<string> {
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
    replacedMsg = replacedMsg.replace(/\{TEAM_A\}/g, teamA);
    replacedMsg = replacedMsg.replace(/\{TEAM_B\}/g, teamB);

    return replacedMsg;
}

export async function handleStaticCommands(channel: string, message: string, user: User, userName: string, tags: ChatUserstate): Promise<boolean> {
    const userCommands = await requireUserCommands(channel);
    if(userCommands[message.toLowerCase()] && !userCommands[message.toLowerCase()].identifier && userCommands[message.toLowerCase()].active && hasAccess(tags, userCommands[message.toLowerCase()]) && user.betSeasonId) {
        const currentRound = await getObj<BetRoundData>(roundKey(channel));
    
        const msg = userCommands[message.toLowerCase()].message;
        if((!msg.includes('USER_BETS_CORRECT') && !msg.includes('USER_BETS_WRONG') && !msg.includes('USER_BETS_ACCURACY')) || user.streamDelay === 0 || (!currentRound || (!currentRound.winner || currentRound.announcedWinner))) {
            publish(channel, await replaceBetPlaceholder(msg, userName, user.betSeasonId, user.teamAName, user.teamBName));
        } else {
            publish(channel, 'Der Command ist derzeit nicht verfügbar.');
        }
        
        return true;
    }

    return false;
}

export async function getBettingCommands(channel: string): Promise<{startBet: Command, bet: Command, winner: Command}> {
    const userCommands = await requireUserCommands(channel);
    const list = Object.values(userCommands);
    const startBet = list.find(({identifier}) => identifier === 'startbet')!;
    const bet = list.find(({identifier}) => identifier === 'bet')!;
    const winner = list.find(({identifier}) => identifier === 'betwinner')!;

    return {startBet, bet, winner};
}

export async function processCommands(channel: string, tags: ChatUserstate, message: string): Promise<void> {
    const user = await requireUser(channel);

    if(! user?.useBets) {
        return;
    }

    const isStatic = await handleStaticCommands(channel, message, user, tags.username!, tags);
    if(isStatic) {
        return;
    }

    const {startBet: startBetCommand, bet: betCommand, winner: winnerCommand} = await getBettingCommands(channel);

    if(!startBetCommand || !betCommand || !winnerCommand) {
        return;
    }

    if(message !== startBetCommand.command && !message.toLowerCase().startsWith(betCommand.command.toLowerCase()) && !message.startsWith(winnerCommand.command)) {
        return;
    }

    if(message.toLowerCase() === startBetCommand.command.toLowerCase() && startBetCommand.active && hasAccess(tags, startBetCommand)) {
        await initializeBet(channel, user.id);
    } else if(message.toLowerCase().startsWith(winnerCommand.command.toLowerCase() || '') && winnerCommand.active && hasAccess(tags, winnerCommand)) {
        const result = message.substr(winnerCommand.command.length + 1).toLowerCase();
        await resolveBet(channel, user.id, result);
    } else if(message.toLowerCase().startsWith(betCommand.command.toLowerCase() || '') && betCommand.active && hasAccess(tags, betCommand)) {
        await registerBet(channel, user.id, +tags["user-id"]!, tags["display-name"]!, tags.username!, message);
	}
}