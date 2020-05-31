import {requireBettingRound, clearBettingCache, requireUser, clearUserCache, startBet} from '../../../src/services/betting/state';

jest.mock('../../../src/services/entity/BetRound', () => ({
    getRoundId: jest.fn(),
    getRoundById: jest.fn(),
    patchBetRound: jest.fn(),
}));

jest.mock('../../../src/services/entity/User', () => ({
    getUserByTrustedChannel: jest.fn(),
    loadUserById: jest.fn(),
}));

jest.mock('../../../src/services/twitchChat', () => ({
    publish: jest.fn(),
}));

jest.mock('../../../src/services/twitchApi', () => ({
    fetchChatterCount: jest.fn(),
}));

jest.mock('../../../src/services/websocket', () => ({
    sendMessage: jest.fn(),
}));

jest.mock('../../../src/services/betting/chatCommands', () => ({
    getBettingCommands: jest.fn(async () => ({
        startBet: {message: 'test {BET_COMMAND}'},
        bet: {command: '!bet'},
    })),
}));

import {getRoundId, getRoundById, patchBetRound} from '../../../src/services/entity/BetRound';
import {getUserByTrustedChannel, loadUserById} from '../../../src/services/entity/User';
import {publish} from '../../../src/services/twitchChat';
import {sendMessage} from '../../../src/services/websocket';
import {fetchChatterCount} from '../../../src/services/twitchApi';

jest.useFakeTimers();
const testChannel = '#testchannel';

describe('requireBettingRound', () => {
    beforeEach(() => {
        (getRoundId as jest.Mock).mockReset();
        (getRoundById as jest.Mock).mockReset();
        clearBettingCache(testChannel);
    });

    test('no round', async () => {
        (getRoundId as jest.Mock).mockReturnValueOnce(0);
        const round = await requireBettingRound(testChannel, 1);

        expect(getRoundId).toHaveBeenCalledTimes(1);
        expect(getRoundById).not.toHaveBeenCalled();
        expect(round).toBeTruthy();
    });

    test('known round', async () => {
        (getRoundId as jest.Mock).mockReturnValueOnce(1);
        (getRoundById as jest.Mock).mockReturnValueOnce(({chatters: 8, status: 'betting', created: 123, result: '', bets: 3, bBets: 1}));
        const round = await requireBettingRound(testChannel, 1);

        expect(getRoundId).toHaveBeenCalledTimes(1);
        expect(getRoundById).toHaveBeenCalledTimes(1);
        expect(round).toBeTruthy();
    });

    test('only one load', async () => {
        (getRoundId as jest.Mock).mockReturnValueOnce(1);
        (getRoundById as jest.Mock).mockReturnValueOnce(({chatters: 8, status: 'betting', created: 123, result: '', bets: 3, bBets: 1}));
        const round = await requireBettingRound(testChannel, 1);
        expect(getRoundId).toHaveBeenCalledTimes(1);
        expect(getRoundById).toHaveBeenCalledTimes(1);
        expect(round).toBeTruthy();
        const round1 = await requireBettingRound(testChannel, 1);
        expect(getRoundId).toHaveBeenCalledTimes(1);
        expect(getRoundById).toHaveBeenCalledTimes(1);
        expect(round1).toBeTruthy();
    });
});

describe('requireUser', () => {
    beforeEach(() => {
        (getUserByTrustedChannel as jest.Mock).mockReset();
        (loadUserById as jest.Mock).mockReset();
        clearUserCache(testChannel);
    });

    test('not from store', async () => {
        (getUserByTrustedChannel as jest.Mock).mockReturnValueOnce({id: 1});
        (loadUserById as jest.Mock).mockReturnValueOnce({id: 123});

        const user = await requireUser(testChannel);
        expect(getUserByTrustedChannel).toHaveBeenCalledTimes(1);
        expect(loadUserById).toHaveBeenCalledTimes(1);
        expect(user).toEqual({id: 123});

    });
    test('from store', async () => {
        (getUserByTrustedChannel as jest.Mock).mockReturnValueOnce({id: 1});
        (loadUserById as jest.Mock).mockReturnValueOnce({id: 123});

        const user = await requireUser(testChannel);
        expect(getUserByTrustedChannel).toHaveBeenCalledTimes(1);
        expect(loadUserById).toHaveBeenCalledTimes(1);
        expect(user).toEqual({id: 123});


        const user1 = await requireUser(testChannel);
        expect(getUserByTrustedChannel).toHaveBeenCalledTimes(1);
        expect(loadUserById).toHaveBeenCalledTimes(1);
        expect(user1).toEqual({id: 123});
    });
});

describe('startBet',() => {
    beforeEach(() => {
        (fetchChatterCount as jest.Mock).mockReset();
        (publish as jest.Mock).mockReset();
        (patchBetRound as jest.Mock).mockReset();
        (sendMessage as jest.Mock).mockReset();

        (getRoundId as jest.Mock).mockReturnValueOnce(1);
        (getRoundById as jest.Mock).mockReturnValueOnce(({chatters: 8, status: 'betting', created: 123, result: '', bets: 3, bBets: 1}));

        clearUserCache(testChannel);
    });

    test('general flow - no reset', async () => {
        (fetchChatterCount as jest.Mock).mockRejectedValueOnce(54);
        await startBet(testChannel, 1, false);

        expect(fetchChatterCount).toHaveBeenCalledTimes(0);
        expect(publish).toHaveBeenCalledWith(testChannel, 'test !bet');

        await jest.runAllTimers();
        await jest.runAllImmediates();

        expect(patchBetRound).toHaveBeenCalledTimes(1);
        expect(sendMessage).toHaveBeenCalledTimes(1);
    });

    test('general flow - with reset', async () => {
        (fetchChatterCount as jest.Mock).mockReturnValueOnce(54);
        await startBet(testChannel, 1, true);

        expect(fetchChatterCount).toHaveBeenCalledTimes(1);
        expect(publish).toHaveBeenCalledWith(testChannel, 'test !bet');

        await jest.runAllTimers();
        await jest.runAllImmediates();

        expect(patchBetRound).toHaveBeenCalledTimes(1);
        expect(sendMessage).toHaveBeenCalledTimes(1);
    });
})