import {Client} from 'tmi.js';
import config from '../config';
import { getDeaultChannels } from './entity/User';

const client = config.twitch.defaultBotIdentity.length > 0 && config.twitch.defaultBotToken.length > 0 && Client({
	options: { debug: true },
	connection: {
		reconnect: true,
		secure: true
	},
	identity: {
		username: config.twitch.defaultBotIdentity,
		password: config.twitch.defaultBotToken
	},
	channels: []
});

async function joinDefaultChannel(): Promise<void> {
    const channels = await getDeaultChannels();
    channels.forEach((c) => joinChannel(c));
}

async function connect(): Promise<void> {
    if(client) {
        await client.connect();
        await joinDefaultChannel();
    }
}

connect();

client && client.on('message', (channel, tags, message, self) => {
	if(self) return;
	if(message.toLowerCase() === '!hello') {
		client.say(channel, `@${tags.username}, heya!`);
	}
});

export function joinChannel(channel: string): void {
    client && client.join(channel);
}

export function partChannel(channel: string): void {
    client && client.part(channel);
}