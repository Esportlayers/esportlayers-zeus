module.exports = {
    "up": "ALTER TABLE bot_commands MODIFY type ENUM ('default', 'dotaWinLoss', 'betting_user', 'betting_streamer') NOT NULL DEFAULT 'default'",
    "down": ""
}