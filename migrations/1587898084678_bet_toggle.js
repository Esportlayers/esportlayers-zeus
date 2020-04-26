module.exports = {
    "up": "ALTER TABLE user ADD COLUMN use_bets boolean NOT NULL DEFAULT false",
    "down": ""
}