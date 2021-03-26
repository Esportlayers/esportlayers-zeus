import { get, set } from "../../../loader/redis";

import { ChatUserstate } from "tmi.js";
import dayjs from "dayjs";
import { publish } from "../../twitchChat";

const channelsToBeChecked = new Set(["#shokztv", "#griefcode"]);

const getKey = (channel: string, name: string) =>
  `russian_word_detect_${channel}_${name}`;

export default async function processMessage(
  channel: string,
  tags: ChatUserstate,
  message: string
): Promise<boolean> {
  if (
    channelsToBeChecked.has(channel) &&
    /[а-яА-ЯЁё]/.test(message) &&
    tags["user-id"]
  ) {
    const name = tags["display-name"] || tags["username"];
    const lastDetection = +((await get(getKey(channel, name!))) || 0);
    if (lastDetection !== 0 && lastDetection + 600 > dayjs().unix()) {
      publish(
        channel,
        `/ban ${name} Detected Cyrillic in at least 2 messages the last 10 Minutes - warning was given prior.`
      );
    } else {
      publish(channel, `/timeout ${name} 60 Cyrillic chars detected.`);
      publish(
        channel,
        `@${name} Please speak only German or English. You will be permanently banned on your next Cyrillic message.`
      );
      await set(getKey(channel, name!), "" + dayjs().unix());
    }
    return true;
  }
  return false;
}
