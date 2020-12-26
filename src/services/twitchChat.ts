import {ChatUserstate, Client} from 'tmi.js';
import config from '../config';
import { getDeaultChannels, getCustomBots, getChannelCommands, loadUserById, getUserByTrustedChannel, loadStats } from './entity/User';
import { processCommands, clearBettingCommandsCache } from './betting/chatCommands';
import { getObj, setObj } from '../loader/redis';
import { Command } from '@streamdota/shared-types';
const tmi = require('tmi.js');

const defaultConfig = {
	options: { debug: false },
	connection: {
		reconnect: true,
		secure: true
	},
	channels: []
};

let client: Client | null = null;
const customInstances = new Map();

async function connect(): Promise<void> {
    if(config.twitch.defaultBotIdentity.length > 0 && config.twitch.defaultBotToken.length > 0) {
		const channels = await getDeaultChannels();
		client = new tmi.client({
			...defaultConfig,
			identity: {
				username: config.twitch.defaultBotIdentity,
				password: config.twitch.defaultBotToken
			},
			channels,
		});
		client!.setMaxListeners(0);
		await client!.connect();
		client!.on('message', messageListener);
	}
	
	const customBots = await getCustomBots();
	for(const {channel, name, password} of customBots) {
		await createInstance('#' + channel.toLowerCase(), name, password);
	}
}
connect();

export function hasAccess(tags: ChatUserstate, command: Command): boolean {
	const subscriberBadge = tags.badges && tags.badges.subscriber;
	if(command.userAccess) return true;
	if(command.tier1Access && tags.subscriber) return true;
	if(command.tier2Access && subscriberBadge && subscriberBadge.length >= 4 && subscriberBadge.startsWith('2')) return true;
	if(command.tier3Access && subscriberBadge && subscriberBadge.length >= 4 && subscriberBadge.startsWith('3')) return true;
	if(command.vipAccess && tags.badges && tags.badges.vip) return true;
	if(command.modAccess && tags.mod) return true;
	if(command.streamerAccess && tags.badges && tags.badges.broadcaster) return true;
	return false;
}

async function replacePlaceholder(message: string, tags: ChatUserstate, channel: string): Promise<string> {
	let fullMessage = message;
	if(tags["display-name"]) {
		fullMessage = fullMessage.replace(/\{USER\}/g, tags["display-name"]);
	}

	if(message.includes('{TOTAL_GAMES}') || message.includes('{GAMES_WON}') || message.includes('{GAMES_LOST}')) {
		const {id} = await getUserByTrustedChannel(channel);
		const userStats = await loadStats(id);
		const wins = userStats.filter(({won}) => won).length;

		fullMessage = fullMessage.replace(/\{TOTAL_GAMES\}/g, '' + userStats.length);
		fullMessage = fullMessage.replace(/\{GAMES_WON\}/g, '' + wins);
		fullMessage = fullMessage.replace(/\{GAMES_LOST\}/g, '' + (userStats.length - wins));
	}

	return fullMessage;
}

export interface ChannelCommand {
	[x: string]: Command;
}
export function getCommandsCacheKey(channel: string, types: string[], type: 'entity' | 'commands' = 'entity'): string {
	return `commands_${channel.toLowerCase()}_${type}_${types.join('-')}`;
}

async function messageListener(channel: string, tags: ChatUserstate, message: string, self: boolean) {
	if(self) return;

	let userCommands = await getObj<ChannelCommand>(getCommandsCacheKey(channel, ['default', 'dotaWinLoss']));

	if(!userCommands) {
		const commands = await getChannelCommands(channel, new Set(['default', 'dotaWinLoss']));
		const mapped = commands.reduce<ChannelCommand>((acc, command) => {
			if(command.active) {
				acc[command.command.toLowerCase()] = command;
			}
			return acc;
		}, {});
		await setObj(getCommandsCacheKey(channel, ['default', 'dotaWinLoss']), mapped);
		const commandKeys = commands.map(({command}) => command.toLowerCase());
		await setObj(getCommandsCacheKey(channel, ['default', 'dotaWinLoss'], 'commands'), commandKeys);
		userCommands = mapped;
	}

	const commandKeys = (await getObj<string[]>(getCommandsCacheKey(channel, ['default', 'dotaWinLoss'], 'commands')))!;
	const lowerMessage = message.toLowerCase();
	if(new Set(commandKeys).has(lowerMessage) && hasAccess(tags, userCommands[lowerMessage])) {
		const msg = await replacePlaceholder(userCommands[lowerMessage].message, tags, channel)
		publish(channel, msg);
	}

	processCommands(channel, tags, message);
}

export function joinChannel(channel: string): void {
    client && client.join(channel);
}

export function partChannel(channel: string): void {
	//@ts-ignore
	if(client && client.getChannels().includes(channel)) {
		client.part(channel);
	}
}

export function publish(channel: string, message: string): void {
	if(customInstances.has(channel)) {
		customInstances.get(channel).say(channel, message);
	} else {
		client && client.readyState() === 'OPEN' && client.say(channel, message);
	}
}

export async function createInstance(channel: string, username: string, password: string): Promise<void> {
	await deleteInstance(channel);
	partChannel(channel);

	const instance = new tmi.client({
		...defaultConfig,
		identity: {username, password},
		channels:[channel]
	});
	instance.setMaxListeners(0);
	instance.connect();
	instance.on('message', messageListener);
	customInstances.set(channel, instance);
}

export async function deleteInstance(channel: string): Promise<void> {
	if(customInstances.has(channel)) {
		await customInstances.get(channel).disconnect();
		customInstances.delete(channel);
	}
}

export async function clearUserCommandsChache(userId: number): Promise<void> {
	const {displayName}  = (await loadUserById(userId))!;
	const fullChannel = '#' + displayName.toLowerCase();

	await setObj(getCommandsCacheKey(fullChannel, ['default', 'dotaWinLoss']), null);
	await setObj(getCommandsCacheKey(fullChannel, ['default', 'dotaWinLoss'], 'commands'), null);

	clearBettingCommandsCache(fullChannel);
}

export function getChannels(): string[] {
	if(client) {
		return [...client.getChannels(), ...customInstances.keys()];
	}

	return [];
}
