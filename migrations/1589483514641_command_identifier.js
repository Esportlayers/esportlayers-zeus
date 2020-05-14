module.exports = {
    "up": "ALTER TABLE bot_commands ADD COLUMN internal_identifier varchar(191) NOT NULL DEFAULT ''",
    "down": ""
}