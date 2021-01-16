module.exports = {
    "up": "ALTER TABLE user ADD COLUMN keyword_listening VARCHAR(191) DEFAULT NULL",
    "down": ""
}