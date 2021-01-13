module.exports = {
    "up": "ALTER TABLE user ADD COLUMN `use_keyword_listener` BOOLEAN NOT NULL DEFAULT FALSE",
    "down": ""
}