import { ChatUserstate } from "tmi.js";
import { fetchUserById } from "../../twitchApi";
import { getKeywordByChannel } from "./chatListener";
import { getScopedUser } from "../../entity/Scopes";
import { getUserByTrustedChannel } from "../../entity/User";
import { sendMessage } from "../../websocket";

export async function getKeywordByDisplayName(
  displayName: string
): Promise<string> {
  return await getKeywordByChannel(`#${displayName.toLocaleLowerCase()}`);
}

export async function processChatMessage(
  channel: string,
  tags: ChatUserstate,
  message: string
): Promise<boolean> {
  const lowerMessage = message.toLocaleLowerCase();
  const user = await getUserByTrustedChannel(channel);
  const subscribed = await getScopedUser(user.id);

  for (const { id, displayName } of subscribed) {
    let keyword = await getKeywordByDisplayName(displayName);

    if (
      keyword !== "none" &&
      lowerMessage.includes(keyword) &&
      tags["user-id"]
    ) {
      const twitchUser = await fetchUserById(tags["user-id"]);
      sendMessage(id, "keyword_message", {
        message,
        name: twitchUser.display_name,
        logo: twitchUser.logo,
        time: tags["tmi-sent-ts"],
      });
    }
  }

  return false;
}
