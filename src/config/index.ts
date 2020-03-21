import dotenv from 'dotenv';

process.env.NODE_ENV = process.env.NODE_ENV || 'development';
dotenv.config();

const envFound = dotenv.config();
if (!envFound) {
  console.info('No .env file specified, falling back to defaults');
}

export default {
  env: process.env.NODE_ENV || 'production',
  jwtSecret: process.env.JWT_VERIFY_SEED || '8372gjh2b3u23g8bf',
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
  },
}
