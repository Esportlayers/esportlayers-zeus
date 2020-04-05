module.exports = {
    "up": "ALTER TABLE user ADD COLUMN use_channel_bot boolean NOT NULL DEFAULT FALSE, ADD COLUMN custom_channel_bot_name varchar(191) NOT NULL DEFAULT '', ADD COLUMN  custom_channel_bot_token varchar(191) NOT NULL DEFAULT '';",
    "down": "ALTER TABLE user DROP use_channel_bot, DROP custom_channel_bot_name, DROP custom_channel_bot_token;"
}