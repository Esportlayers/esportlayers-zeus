module.exports = {
    "up": "ALTER TABLE user ADD COLUMN casting_stats_source VARCHAR(191) DEFAULT NULL",
    "down": ""
}