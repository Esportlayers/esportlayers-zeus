module.exports = {
    "up": "ALTER TABLE user ADD COLUMN `use_automatic_voting` BOOLEAN NOT NULL DEFAULT FALSE",
    "down": ""
}