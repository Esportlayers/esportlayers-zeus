import { del, get, set } from "../../../loader/redis";
import { getUserByTrustedChannel, loadUserById } from "../../entity/User";

import { ChatUserstate } from "tmi.js";
import { fetchUserById } from "../../twitchApi";
import { sendMessage } from "../../websocket";

export function keywordListenerKey(channel: string): string {
  return `keyword_listener${channel.toLowerCase()}`;
}

export async function getKeywordByChannel(channel: string): Promise<string> {
  let keyword = await get(keywordListenerKey(channel));

  if (!keyword || keyword !== "none") {
    const { id } = await getUserByTrustedChannel(channel);
    const user = await loadUserById(id);
    keyword = (user?.useKeywordListener && user?.keywordListener) || "none";
    await set(keywordListenerKey(channel), keyword);
  }

  return keyword;
}

export async function processChatMessage(
  channel: string,
  tags: ChatUserstate,
  message: string
): Promise<boolean> {
  const lowerMessage = message.toLocaleLowerCase();
  let keyword = await getKeywordByChannel(channel);

  if (keyword !== "none" && lowerMessage.includes(keyword) && tags["user-id"]) {
    const twitchUser = await fetchUserById(tags["user-id"]);
    const { id } = await getUserByTrustedChannel(channel);
    sendMessage(id, "keyword_message", {
      message,
      name: twitchUser.display_name,
      logo: twitchUser.logo,
      time: tags["tmi-sent-ts"],
    });
  }

  return false;
}

export async function resetKeywordListener(userId: number): Promise<void> {
  const { displayName } = (await loadUserById(userId))!;
  const fullChannel = "#" + displayName.toLowerCase();
  await del(keywordListenerKey(fullChannel));
}
