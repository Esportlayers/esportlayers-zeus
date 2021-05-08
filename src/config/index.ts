import dotenv from "dotenv";

process.env.NODE_ENV = process.env.NODE_ENV || "development";
dotenv.config();

const envFound = dotenv.config();
if (!envFound) {
  console.info("No .env file specified, falling back to defaults");
}

export default {
  env: process.env.NODE_ENV || "production",
  gsiPort: process.env.DOTA_GSI_PORT || 8443,
  googleFontApiKey: process.env.GOOGLE_FONT_API_KEY || "",
  jwtSecret: process.env.JWT_VERIFY_SEED || "8372gjh2b3u23g8bf",
  updateStreamerState: process.env.UPDATE_STREAM_STATE !== "0" || false,
  mysql: {
    host: process.env.MYSQL_HOST || "localhost",
    user: process.env.MYSQL_USER || "root",
    password: process.env.MYSQL_PASSWORD || "",
    database: process.env.MYSQL_DATABASE || "app",
  },
  port: process.env.PORT || 80,
  twitch: {
    clientId: process.env.TWITCH_CLIENT_ID || "",
    clientSecret: process.env.TWITCH_CLIENT_SECRET || "",
    callbackURL: process.env.TWITCH_CALLBACK_URL || "",
    callbackPredictionsURL: process.env.TWITCH_CALLBACK_PREDICTIONS_URL || "",

    defaultBotIdentity: process.env.TWITCH_BOT_IDENTITY_NAME || "",
    defaultBotToken: process.env.TWITCH_BOT_IDENTITY_TOKEN || "",
  },
  sentryDSN: process.env.SENTRY_DSN || "",
  steamApiKey: process.env.STEAM_API_KEY || "",
  debugGsi: process.env.DEBUG_GSI || false,
  gsiRecordingKey: process.env.GSI_RECORDING_KEY || "",
  provableServerSeed:
    process.env.PROVABLE_SERVER_SEED || "ac67a205-a526-45a5-bf7b-e1254d112785",
  naixApiKey: process.env.NAIX_API_KEY || "",
  streamerApiKey: process.env.STREAMER_API_KEY || "",
  twitterBearerToken: process.env.TWITTER_TOKEN || "",
  twitterListeningUserId: +(process.env.TWITTER_LISTENING_USER_ID || 0),
  twitterListeningValue: process.env.TWITTER_LISTENING_VALUE || "",
};
