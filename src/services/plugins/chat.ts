import { ChatUserstate } from "tmi.js";
import processRussianCheckMessage from "./chat/russianWordBanning";

export default async function processMessage(
  channel: string,
  tags: ChatUserstate,
  message: string
): Promise<boolean> {
  return await processRussianCheckMessage(channel, tags, message);
}
