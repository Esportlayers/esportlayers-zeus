module.exports = {
    "up": "ALTER TABLE user CHANGE COLUMN dota_stats_from dota_stats_from ENUM ('session', 'day', 'manual');",
    "down": ""
}