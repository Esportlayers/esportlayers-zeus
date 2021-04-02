import cfg from "../config";
import dayjs from "dayjs";
import fetch from "node-fetch";
import request from "request";
import { sendMessage } from "../services/websocket";
let timeout = 0;

const rulesURL = "https://api.twitter.com/2/tweets/search/stream/rules";
const streamURL =
  "https://api.twitter.com/2/tweets/search/stream?expansions=author_id";
const authorURL =
  "https://api.twitter.com/2/users?ids={USER_ID}&user.fields=profile_image_url,username";

const sleep = async (delay: number) =>
  new Promise((resolve) => setTimeout(() => resolve(true), delay));
const rules =
  cfg.twitterListeningValue.length > 0
    ? [{ value: cfg.twitterListeningValue }]
    : [];

// Get stream rules
async function getRules() {
  const response = await fetch(rulesURL, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${cfg.twitterBearerToken}`,
    },
  });
  return await response.json();
}

// Set stream rules
async function setRules() {
  const data = {
    add: rules,
  };

  const response = await fetch(rulesURL, {
    method: "POST",
    body: JSON.stringify(data),
    headers: {
      "content-type": "application/json",
      Authorization: `Bearer ${cfg.twitterBearerToken}`,
    },
  });

  return response.body;
}

// Delete stream rules
async function deleteRules(rules: { data: Array<{ id: number }> }) {
  if (!Array.isArray(rules.data)) {
    return null;
  }

  const ids = rules.data.map((rule) => rule.id);

  const data = {
    delete: {
      ids: ids,
    },
  };

  const response = await fetch(rulesURL, {
    method: "post",
    body: JSON.stringify(data),
    headers: {
      "content-type": "application/json",
      Authorization: `Bearer ${cfg.twitterBearerToken}`,
    },
  });

  return response.body;
}

async function getAuthor(userId: string) {
  const response = await fetch(authorURL.replace("{USER_ID}", userId), {
    method: "GET",
    headers: {
      Authorization: `Bearer ${cfg.twitterBearerToken}`,
    },
  });
  return await response.json();
}

const reconnect = async (stream: request.Request) => {
  timeout++;
  stream.abort();
  await sleep(2 ** timeout * 1000);
  streamTweets();
};
async function streamTweets() {
  const config = {
    url: streamURL,
    auth: {
      bearer: cfg.twitterBearerToken,
    },
    timeout: 31000,
  };
  try {
    const stream = request.get(config);

    stream
      .on("data", async (data) => {
        try {
          const json = JSON.parse(data as string);
          if (json.connection_issue) {
            reconnect(stream);
          } else {
            if (json.data) {
              const authorResponse = await getAuthor(json.data.author_id);
              const author = authorResponse.data[0];
              if (author) {
                sendMessage(
                  cfg.twitterListeningUserId as number,
                  "keyword_message",
                  {
                    message: json.data.text,
                    name: author.username,
                    logo: author.profile_image_url,
                    time: dayjs().unix(),
                  }
                );
              }
            } else {
              console.log("[Twitter Listener] authError:", json);
            }
          }
        } catch (e) {}
      })
      .on("error", (error) => {
        // Connection timed out
        console.log("[Twitter Listener] error", error);
        reconnect(stream);
      });
  } catch (e) {
    console.log("[Twitter Listener] authError", e);
  }
}

async function start(): Promise<void> {
  const currentRules = await getRules();

  // Delete all stream rules
  await deleteRules(currentRules);

  // Set rules based on array above
  await setRules();

  await streamTweets();
}

if (cfg.twitterListeningValue.length > 0) {
  start();
}
