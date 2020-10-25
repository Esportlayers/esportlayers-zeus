import dotenv from 'dotenv';

process.env.NODE_ENV = process.env.NODE_ENV || 'development';
dotenv.config();

const envFound = dotenv.config();
if (!envFound) {
  console.info('No .env file specified, falling back to defaults');
}

export default {
  env: process.env.NODE_ENV || 'production',
  gsiPort: process.env.DOTA_GSI_PORT || 8443,
  googleFontApiKey: process.env.GOOGLE_FONT_API_KEY || '',
  jwtSecret: process.env.JWT_VERIFY_SEED || '8372gjh2b3u23g8bf',
  updateStreamerState: process.env.UPDATE_STREAM_STATE !== '0' || false,
  mysql: {
    host: process.env.MYSQL_HOST || 'localhost',
    user: process.env.MYSQL_USER ||  'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'app'
  },
  port: process.env.PORT || 80,
  server: {
    secure: process.env.PORT === '443',
    certs: {
      basePath: process.env.SERVER_CERT_BASEPATH || '',
      key: process.env.SERVER_CERT_KEY || '',
      cert: process.env.SERVER_CERT_CERT || '',
      chain: process.env.SERVER_CERT_CHAIN || '',
    }
  },
  twitch: {
    clientId: process.env.TWITCH_CLIENT_ID || '',
    clientSecret: process.env.TWITCH_CLIENT_SECRET || '',
    callbackURL: process.env.TWITCH_CALLBACK_URL || '',

    defaultBotIdentity: process.env.TWITCH_BOT_IDENTITY_NAME || '',
    defaultBotToken: process.env.TWITCH_BOT_IDENTITY_TOKEN || '',
  },
  sentryDSN: process.env.SENTRY_DSN || '',
  steamApiKey: process.env.STEAM_API_KEY || '',
  debugGsi: process.env.DEBUG_GSI || false,
  gsiRecordingKey: process.env.GSI_RECORDING_KEY || '',
}
