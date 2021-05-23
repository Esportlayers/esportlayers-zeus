import { Client } from "tmi.js";
import chunk from "lodash/chunk";
import config from "../config";
import { getDeaultChannels } from "./entity/User";
import { messageListener } from "./chat/message";
import processChatMessage from "./wordStats";
import { random } from "lodash";
import { v4 } from "uuid";

const CHUNK_SIZE = 20;
const tmi = require("tmi.js");

const defaultConfig = {
  options: { debug: false },
  connection: {
    reconnect: true,
    secure: true,
  },
  channels: [],
};

const channelMap = new Map<string, string>();
const instances = new Map<string, Client>();
const instanceIds: string[] = [];

async function generateNewInstance(channels: string[]): Promise<Client> {
  const client = new tmi.client({
    ...defaultConfig,
    identity: {
      username: config.twitch.defaultBotIdentity,
      password: config.twitch.defaultBotToken,
    },
    channels,
  });
  client!.setMaxListeners(0);
  await client!.connect();
  client!.on("message", messageListener);

  return client;
}

async function connect(): Promise<void> {
  if (
    config.twitch.defaultBotIdentity.length > 0 &&
    config.twitch.defaultBotToken.length > 0
  ) {
    const allChannels = await getDeaultChannels();
    const chunks = chunk(allChannels, CHUNK_SIZE);
    for (const channels of chunks) {
      const instanceId = v4();
      instanceIds.push(instanceId);
      const client = await generateNewInstance(channels);
      instances.set(instanceId, client);
      for (const channel of channels) {
        channelMap.set(channel, instanceId);
      }
    }
  }
}

connect();

export function joinChannel(channel: string): void {
  const instanceId = instanceIds[random(instanceIds.length - 1)];
  instances.get(instanceId)!.join(channel);
  channelMap.set(channel, instanceId);
}

export function partChannel(channel: string): void {
  instances.get(channelMap.get(channel)!)!.part(channel);
  channelMap.delete(channel);
}

export async function publish(channel: string, message: string): Promise<void> {
  await processChatMessage(channel, message, "streamdotabot");

  const client = instances.get(channelMap.get(channel)!)!;
  if (client && client.readyState() === "OPEN") {
    client.say(channel, message);
  }
}

export function info(channel: string): {
  channels: number;
  instanceId: string;
  readyState?: string;
} {
  const instanceId = channelMap.get(channel)!;
  const client = instances.get(instanceId);

  console.log(
    `[Twitch-Chat] Instance: ${instanceId}, State: ${client?.readyState()}, Channels: ${client
      ?.getChannels()
      .join(", ")}`
  );

  return {
    instanceId,
    channels: (client?.getChannels().length || 0) + 1,
    readyState: client?.readyState(),
  };
}
export function getChannels(): string[] {
  if (channelMap) {
    return [...channelMap.keys()];
  }

  return [];
}
