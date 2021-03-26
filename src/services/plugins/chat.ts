import { ChatUserstate } from "tmi.js";
import processRussianCheckMessage from "./chat/russianWordBanning";
import { processChatMessage as processShokzFightMessage } from "./chat/shokzFight";

export default async function processMessage(
  channel: string,
  tags: ChatUserstate,
  message: string
): Promise<boolean> {
  return (
    (await processRussianCheckMessage(channel, tags, message)) ||
    processShokzFightMessage(channel, tags, message)
  );
}
