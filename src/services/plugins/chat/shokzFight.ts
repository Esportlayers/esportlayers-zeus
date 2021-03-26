import { ChatUserstate } from "tmi.js";
import { publish } from "../../twitchChat";

const channelsToBeChecked = new Set(["#shokztv", "#griefcode"]);
const timeouts = [60, 120, 300];
interface Fight {
  id: string;
  fighter1: string;
  fighter1mod: boolean;
  fighter2: string;
  fighter2mod: boolean;
}

const COMMANDS = {
  FIGHT: "shokzFight",
  DENY: "!deny",
};

let fights: Fight[] = [];

export function processChatMessage(
  channel: string,
  tags: ChatUserstate,
  message: string
): boolean {
  if (!channelsToBeChecked.has(channel)) {
    return false;
  }

  if (
    message.startsWith(COMMANDS.FIGHT) ||
    message.toLowerCase().startsWith(COMMANDS.DENY)
  ) {
    const username = tags["display-name"] || tags["username"] || "";
    const payload = message.substr(COMMANDS.FIGHT.length + 1);
    const fight = fights.find(({ fighter1 }) => fighter1 === username);
    if (fight && payload.length) {
      publish(channel, `${username} du kämpfst schon gegen ${fight.fighter2}!`);
      return true;
    }

    const proposed = fights.find(
      ({ fighter2 }) => fighter2.toLowerCase() === username.toLowerCase()
    );
    if (proposed && message === COMMANDS.FIGHT) {
      proposed.fighter2mod = !!tags["mod"];
      startFight(proposed, channel);
      return true;
    }

    if (
      proposed &&
      message.startsWith(COMMANDS.FIGHT) &&
      payload.startsWith("@")
    ) {
      const enemy = payload.substr(1);
      if (enemy.toLowerCase() === proposed.fighter1.toLowerCase()) {
        proposed.fighter2mod = !!tags["mod"];
        startFight(proposed, channel);
        return true;
      }
    }

    if (proposed && message.toLowerCase().startsWith(COMMANDS.DENY)) {
      publish(
        channel,
        `PepeLaugh ${username} möchte nicht gegen ${proposed.fighter1} kämpfen PepeLaugh`
      );
      fights = fights.filter(({ id }) => proposed.id !== id);
      return true;
    }

    if (
      payload.startsWith("@") &&
      payload.length &&
      payload.indexOf(" ") === -1
    ) {
      const enemy = payload.substr(1);
      publish(
        channel,
        `shokzFight shokzFight ${username} fordert ${enemy} heraus. Akzeptiere den Kampf mit '${COMMANDS.FIGHT}' oder lehne ab mit '${COMMANDS.DENY}' shokzFight shokzFight`
      );
      const newFight = {
        id: Math.random().toString(36).substring(7),
        fighter1: username,
        fighter2: enemy.toLowerCase(),
        fighter1mod: !!tags["mod"],
        fighter2mod: false,
      };
      fights.push(newFight);
      expireFight(newFight, channel);
      return true;
    }
  }

  return false;
}

function expireFight(fight: Fight, channel: string) {
  setTimeout(() => {
    const expired = fights.find(({ id }) => id === fight.id);
    if (expired) {
      publish(
        channel,
        `FeelsBadMan ${expired.fighter2} hat nicht geantwortet. Es kommt nicht zum Kampf mit ${expired.fighter1} FeelsBadMan`
      );
      fights = fights.filter(({ id }) => expired.id !== id);
    }
  }, 90000);
}

function startFight(fight: Fight, channel: string): void {
  const timeoutTime = timeouts[Math.floor(Math.random() * 3)];
  let rand = Math.random() * 100;
  let winner = rand > 60 ? 2 : rand < 40 ? 1 : 0;
  if (fight.fighter2mod) {
    winner = 2;
  } else if (fight.fighter1mod) {
    winner = 1;
  }

  if (winner === 1) {
    publish(
      channel,
      `Der Kampf wurde entschieden für ${fight.fighter1} PogChamp PepeLaugh Damit bekommt @${fight.fighter2} einen Timeout von ${timeoutTime} Sekunden PepeLaugh OMEGALUTSCH`
    );
    publish(channel, `/timeout @${fight.fighter2} ${timeoutTime}`);
  } else if (winner === 2) {
    publish(
      channel,
      `Der Kampf wurde entschieden für ${fight.fighter2} PogChamp PepeLaugh Damit bekommt @${fight.fighter1} einen Timeout von ${timeoutTime} Sekunden PepeLaugh OMEGALUTSCH`
    );
    publish(channel, `/timeout @${fight.fighter1} ${timeoutTime}`);
  } else if (winner === 0 && rand > 50) {
    publish(
      channel,
      `PepeLaugh PepeLaugh Es haben sich @${fight.fighter1} und @${fight.fighter2} gleichzeitig KO gehauen PepeLaugh Damit bekommen beide einen Timeout von ${timeoutTime} Sekunden PepeLaugh PepeLaugh`
    );
    publish(channel, `/timeout @${fight.fighter1} ${timeoutTime}`);
    publish(channel, `/timeout @${fight.fighter2} ${timeoutTime}`);
  } else if (winner === 0) {
    publish(
      channel,
      `@${fight.fighter1} und @${fight.fighter2} sind beides die letzten Pepega. Keiner von beiden hat den anderen getroffen! Keiner bekommt einen Timeout SwiftLove`
    );
  }
  fights = fights.filter(({ id }) => fight.id !== id);
}
