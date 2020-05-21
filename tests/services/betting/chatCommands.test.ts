const fakeCommands = [
    {active: true, type: 'betting_user', command: 'a', message: 'a response'},
    {active: false, type: 'betting_user', command: 'b', message: 'b response'},
    {active: true, type: 'betting_streamer', command: 'c', message: 'c response'},
];

jest.mock('../../../src/services/entity/Command', () => ({
    getUserCommands: jest.fn(async () => fakeCommands)
}));

process.env.SENTRY_DSN = '';

import {requireUserCommands, clearBettingCommandsCache} from '../../../src/services/betting/chatCommands';
import {getUserCommands} from '../../../src/services/entity/Command';

describe('requireUserCommands', () => {
    const fakeChannel = '#test';
    test('test first call without store', async () => {
        const commands = await requireUserCommands(fakeChannel , 1);
        expect(getUserCommands).toHaveBeenCalledTimes(1);
        expect(getUserCommands).toHaveBeenCalledWith(1);
        expect(commands).toEqual(fakeCommands);
    });

    test('test second call with store', async () => {
        (getUserCommands as jest.Mock).mockClear();
        const commands = await requireUserCommands(fakeChannel , 1);
        expect(getUserCommands).toHaveBeenCalledTimes(0);
        expect(commands).toEqual(fakeCommands);
    });

    test('clear of store', async () => {
        (getUserCommands as jest.Mock).mockClear();
        clearBettingCommandsCache(fakeChannel);
        expect(getUserCommands).toHaveBeenCalledTimes(0);

        const commands = await requireUserCommands(fakeChannel , 1);
        expect(getUserCommands).toHaveBeenCalledTimes(1);
        expect(getUserCommands).toHaveBeenCalledWith(1);
        expect(commands).toEqual(fakeCommands);
    });
})