module.exports = {
    "up": "ALTER TABLE user ADD COLUMN frame_api_key varchar(191) NOT NULL;",
    "down": "ALTER TABLE user DROP frame_api_key;"
}