import {
  clearBettingCommandsCache,
  processCommands,
} from "../betting/chatCommands";
import {
  getChannelCommands,
  getUserByTrustedChannel,
  loadStats,
  loadUserById,
} from "../entity/User";
import { getObj, setObj } from "../../loader/redis";
import { info, publish } from "../twitchChat";

import { ChatUserstate } from "tmi.js";
import { Command } from "@streamdota/shared-types";
import processChatMessage from "../wordStats";
import processMessage from "../plugins/chat";

export function hasAccess(tags: ChatUserstate, command: Command): boolean {
  const subscriberBadge = tags.badges && tags.badges.subscriber;
  if (command.userAccess) return true;
  if (command.tier1Access && tags.subscriber) return true;
  if (
    command.tier2Access &&
    subscriberBadge &&
    subscriberBadge.length >= 4 &&
    subscriberBadge.startsWith("2")
  )
    return true;
  if (
    command.tier3Access &&
    subscriberBadge &&
    subscriberBadge.length >= 4 &&
    subscriberBadge.startsWith("3")
  )
    return true;
  if (command.vipAccess && tags.badges && tags.badges.vip) return true;
  if (command.modAccess && tags.mod) return true;
  if (command.streamerAccess && tags.badges && tags.badges.broadcaster)
    return true;
  return false;
}

async function replacePlaceholder(
  message: string,
  tags: ChatUserstate,
  channel: string
): Promise<string> {
  let fullMessage = message;
  if (tags["display-name"]) {
    fullMessage = fullMessage.replace(/\{USER\}/g, tags["display-name"]);
  }

  if (
    message.includes("{TOTAL_GAMES}") ||
    message.includes("{GAMES_WON}") ||
    message.includes("{GAMES_LOST}")
  ) {
    const { id } = await getUserByTrustedChannel(channel);
    const userStats = await loadStats(id);
    const wins = userStats.filter(({ won }) => won).length;

    fullMessage = fullMessage.replace(
      /\{TOTAL_GAMES\}/g,
      "" + userStats.length
    );
    fullMessage = fullMessage.replace(/\{GAMES_WON\}/g, "" + wins);
    fullMessage = fullMessage.replace(
      /\{GAMES_LOST\}/g,
      "" + (userStats.length - wins)
    );
  }

  return fullMessage;
}

export interface ChannelCommand {
  [x: string]: Command;
}
export function getCommandsCacheKey(
  channel: string,
  types: string[],
  type: "entity" | "commands" = "entity"
): string {
  return `commands_${channel.toLowerCase()}_${type}_${types.join("-")}`;
}

export async function messageListener(
  channel: string,
  tags: ChatUserstate,
  message: string,
  self: boolean
) {
  if (self) return;
  if (message === "!?bot" && tags["username"]?.toLowerCase() === "griefcode") {
    const { instanceId, readyState, channels } = info(channel);
    await publish(
      channel,
      `Instance: ${instanceId}, State: ${readyState}, Channels: ${channels}`
    );
  }
  if (await processMessage(channel, tags, message)) return;

  let userCommands = await getObj<ChannelCommand>(
    getCommandsCacheKey(channel, ["default", "dotaWinLoss"])
  );

  if (!userCommands) {
    const commands = await getChannelCommands(
      channel,
      new Set(["default", "dotaWinLoss"])
    );
    const mapped = commands.reduce<ChannelCommand>((acc, command) => {
      if (command.active) {
        acc[command.command.toLowerCase()] = command;
      }
      return acc;
    }, {});
    await setObj(
      getCommandsCacheKey(channel, ["default", "dotaWinLoss"]),
      mapped
    );
    const commandKeys = commands.map(({ command }) => command.toLowerCase());
    await setObj(
      getCommandsCacheKey(channel, ["default", "dotaWinLoss"], "commands"),
      commandKeys
    );
    userCommands = mapped;
  }

  const commandKeys = (await getObj<string[]>(
    getCommandsCacheKey(channel, ["default", "dotaWinLoss"], "commands")
  ))!;
  const lowerMessage = message.toLowerCase();
  if (
    new Set(commandKeys).has(lowerMessage) &&
    hasAccess(tags, userCommands[lowerMessage])
  ) {
    const msg = await replacePlaceholder(
      userCommands[lowerMessage].message,
      tags,
      channel
    );
    await publish(channel, msg);
  }

  await processChatMessage(channel, message, tags["username"]!);

  processCommands(channel, tags, message);
}

export async function clearUserCommandsChache(userId: number): Promise<void> {
  const { displayName } = (await loadUserById(userId))!;
  const fullChannel = "#" + displayName.toLowerCase();

  await setObj(
    getCommandsCacheKey(fullChannel, ["default", "dotaWinLoss"]),
    null
  );
  await setObj(
    getCommandsCacheKey(fullChannel, ["default", "dotaWinLoss"], "commands"),
    null
  );

  clearBettingCommandsCache(fullChannel);
}
