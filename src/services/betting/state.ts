import { User } from "@streamdota/shared-types";
import dayjs from "dayjs";
import { getObj, setObj } from "../../loader/redis";
import { requireBetOverlay } from "../entity/BetOverlay";
import { createBet, createBetRound, getRoundId, patchBetRound } from "../entity/BetRound";
import { getUserByTrustedChannel, loadUserById } from "../entity/User";
import { fetchChatterCount } from "../twitchApi";
import { publish } from "../twitchChat";
import { sendMessage } from "../websocket";
import { getBettingCommands } from "./chatCommands";

interface BetRoundData {
    status: 'stream_delay' | 'betting' | 'game_running' | 'finished';
    overlayVisibleUntil: number;
    overlayVisible: boolean;
    streamDelay: number;
    votingStartingAt: number;
    votingTimeRemaining: number;
    votingPossibleUntil: number;
    voteCreated: number;
    totalVotesCount: number;
    chatterCounts: number;
    teamACount: number;
    teamAVoters: string[];
    teamBCount: number;
    teamBVoters: string[];
    allVoters: string[];
    winner: null | string;
    winnerAnnouncement: null | number;
    announcedStart: boolean;
    announcedVoteEnd: boolean;
    announcedWinner: boolean;
}

const channeUserCache = new Map<string, User>();

export async function requireUser(channel: string): Promise<User> {
    const lowerChannel = channel.toLowerCase();
    if(!channeUserCache.has(lowerChannel)) {
        const {id} = await getUserByTrustedChannel(channel);
        const user = (await loadUserById(id))!;
        channeUserCache.set(lowerChannel, user);
    }
    return channeUserCache.get(lowerChannel)!;
}


function activeVoteKeys(): string {
    return `betting_active_channels`;
}

async function addChannel(channel: string): Promise<void> {
    const channels = (await getObj<string[]>(activeVoteKeys()) || []);
    await setObj(activeVoteKeys(), channels.concat(channel));
}

async function removeChannel(channel: string): Promise<void> {
    const channels = (await getObj<string[]>(activeVoteKeys()) || []);
    await setObj(activeVoteKeys(), channels.filter((c) => c !== channel));
}

function roundKey(channel: string): string {
    return `betting_round_state_${channel}`;
}

async function updateListener(channel: string, userId: number): Promise<void> {
    const currentRound = await getObj<BetRoundData>(roundKey(channel));
    sendMessage(userId, 'betting_v2', currentRound);
}

async function startVote(channel: string, user: User): Promise<void> {
    const currentRound = await getObj<BetRoundData>(roundKey(channel));
    const {startBet: startBetCommand, bet: betCommand } = await getBettingCommands(channel);
    if(startBetCommand) {
        let message = startBetCommand.message.replace(/\{BET_COMMAND\}/g, betCommand?.command || '');
        message = message.replace(/\{TEAM_A\}/g, user?.teamAName || 'a');
        message = message.replace(/\{TEAM_B\}/g, user?.teamBName || 'b');
        publish(channel, message);
        await createBetRound(user.id, user.betSeasonId);
        await setObj(roundKey(channel), {
            ...currentRound,
            status: 'betting',
            announcedStart: true,
        })
        await updateListener(channel, user.id);
    }
}

async function finishVote(channel: string, user: User): Promise<void> {
    const roundId = await getRoundId(user.id);
    await patchBetRound(roundId, {status: 'running'});
    publish(channel, 'Die Votes sind geschlossen.');
    const currentRound = await getObj<BetRoundData>(roundKey(channel));
    await setObj(roundKey(channel), {
        ...currentRound,
        status: 'game_running',
        announcedVoteEnd: true,
    })
    await updateListener(channel, user.id);
}

async function closeVote(channel: string, user: User): Promise<void> {
    const roundId = await getRoundId(user.id);
    const currentRound = await getObj<BetRoundData>(roundKey(channel));
    await patchBetRound(roundId, {result: currentRound!.winner!, status: 'finished'}, true, user.id);
    const {winner: winnerCommand} = await getBettingCommands(channel);
    publish(channel, winnerCommand.message.replace(/\{WINNER\}/g, currentRound!.winner!));
    await setObj(roundKey(channel), null);
    await removeChannel(channel);
    await updateListener(channel, user.id);
}

export async function initializeBet(channel: string, userId: number): Promise<void> {
    const user = await loadUserById(userId);
    const currentRound = await getObj<BetRoundData>(roundKey(channel));
    
    if(user && (! currentRound || currentRound.status === 'finished')) {
        const overlay = await requireBetOverlay(userId);
        const chatters = await fetchChatterCount(channel.substring(1));
        const ts = dayjs().unix();
        await setObj(roundKey(channel), {
            status: 'stream_delay',
            overlayVisibleUntil: ts + overlay.timerDuration,
            overlayVisible: true,
            streamDelay: user.streamDelay,
            votingStartingAt: ts + user.streamDelay,
            votingTimeRemaining: ts + user.streamDelay,
            votingPossibleUntil: ts + user.streamDelay + overlay.timerDuration,
            voteCreated: ts,
            totalVotesCount: 0,
            chatterCounts: chatters,
            teamACount: 0,
            teamBCount: 0,
            teamAVoters: [],
            teamBVoters: [],
            allVoters: [],
            winner: null,
            winnerAnnouncement: null,
            announcedStart: false,
            announcedVoteEnd: false,
            announcedWinner: false,
        });
        await addChannel(channel);
        await updateListener(channel, userId);
    }
}

export async function registerBet(channel: string, userId: number, votingUserId: number, displayName: string, userName: string, message: string): Promise<void> {
    const currentRound = await getObj<BetRoundData>(roundKey(channel));
    if(currentRound && currentRound.status === 'betting' && !currentRound?.allVoters.includes(userName)) {
        const {bet} = await getBettingCommands(channel);
        const payload = message.substr(bet.command.length + 1).toLowerCase();
        const user = await loadUserById(userId);
        const betOnTeamA = payload.toLowerCase() === user?.teamAName.toLowerCase();
        const betOnTeamB = payload.toLowerCase() === user?.teamBName.toLowerCase();

        if(user && (betOnTeamA || betOnTeamB)) {
            await createBet(userId, votingUserId, displayName, userName, betOnTeamA ? user.teamAName : user.teamBName);
            await setObj(roundKey(channel), {
                ...currentRound,
                allVoters: currentRound.allVoters.concat(userName),
                ...(betOnTeamA ? {teamAVoters: currentRound.teamAVoters.concat(userName), teamACount: currentRound.teamACount + 1, totalVotesCount: currentRound.totalVotesCount + 1} : {}),
                ...(betOnTeamB ? {teamBVoters: currentRound.teamBVoters.concat(userName), teamBCount: currentRound.teamBCount + 1, totalVotesCount: currentRound.totalVotesCount + 1} : {}),
            });

            await updateListener(channel, userId);
        }
    }
}

export async function resolveBet(channel: string, userId: number, result: string): Promise<void> {
    const currentRound = await getObj<BetRoundData>(roundKey(channel));
    if(currentRound && currentRound.status === 'game_running') {
        const user = await loadUserById(userId);
        if(user?.teamAName.toLowerCase() === result.toLowerCase() || user?.teamBName.toLowerCase() === result.toLowerCase()) {
            const ts = dayjs().unix();
            if(user) {
                await setObj(roundKey(channel), {
                    ...currentRound,
                    winner: user?.teamAName.toLowerCase() === result.toLowerCase() ? user?.teamAName : user?.teamBName,
                    winnerAnnouncement: ts + user?.streamDelay,
                });

                await updateListener(channel, userId);
            }
        }
    }
}

async function streamDelayChecker(data: BetRoundData, ts: number, channel: string, user: User): Promise<void> {
    if(data.overlayVisible && data.overlayVisibleUntil <= ts) {
        await setObj(roundKey(channel), {...data, overlayVisible: false});
        await updateListener(channel, user.id);
    }

    if(data.votingStartingAt <= ts && !data.announcedStart) {
        await startVote(channel, user);
    }
}

async function bettingChecker(data: BetRoundData, ts: number, channel: string, user: User): Promise<void> {
    if(data.votingPossibleUntil <= ts && !data.announcedVoteEnd) {
        await finishVote(channel, user);
    } else {
        await setObj(roundKey(channel), {
            ...data,
            votingTimeRemaining: data.votingPossibleUntil - ts,
        });
        await updateListener(channel, user.id);
    }
}

async function gameRunningChecker(data: BetRoundData, ts: number, channel: string, user: User): Promise<void> {
    if(data.winner && data.winnerAnnouncement! <= ts && !data.announcedWinner) {
        await closeVote(channel, user);
    }
}

const statusChecker = {
    stream_delay: streamDelayChecker,
    betting: bettingChecker,
    game_running: gameRunningChecker,
}

export async function updateBetRounds(): Promise<void> {
    const activeBettingChannel = await getObj<string[]>(activeVoteKeys()) || [];
    const ts = dayjs().unix();

    for(const channel of activeBettingChannel) {
        const round = await getObj<BetRoundData>(roundKey(channel));
        const user = await requireUser(channel);

        if(round && round.status !== 'finished') {
            await statusChecker[round.status](round, ts, channel, user);
        }
    }
}

export async function newBettingListener(userId: number, displayName: string): Promise<void> {
    await updateListener('#' + displayName.toLowerCase(), userId);

}