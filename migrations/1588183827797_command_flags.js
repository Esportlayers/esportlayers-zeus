module.exports = {
    "up": "ALTER TABLE bot_commands ADD COLUMN no_response boolean NOT NULL DEFAULT false, ADD COLUMN delete_able boolean NOT NULL DEFAULT true",
    "down": ""
}