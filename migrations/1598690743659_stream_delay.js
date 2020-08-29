module.exports = {
    "up": "ALTER TABLE user ADD COLUMN `stream_delay` INT NOT NULL DEFAULT 0",
    "down": ""
}