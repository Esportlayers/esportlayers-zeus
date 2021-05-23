import { ChatUserstate } from "tmi.js";
import { processChatMessage as processChatListener } from "./chat/chatListener";
import processRussianCheckMessage from "./chat/russianWordBanning";
import { processChatMessage as processScopedChatListener } from "./chat/scopedChatListener";
import { processChatMessage as processShokzFightMessage } from "./chat/shokzFight";

export default async function processMessage(
  channel: string,
  tags: ChatUserstate,
  message: string
): Promise<boolean> {
  return (
    (await processChatListener(channel, tags, message)) ||
    (await processScopedChatListener(channel, tags, message)) ||
    (await processRussianCheckMessage(channel, tags, message)) ||
    (await processShokzFightMessage(channel, tags, message))
  );
}
