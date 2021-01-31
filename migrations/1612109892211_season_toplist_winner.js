module.exports = {
    "up": "ALTER TABLE bet_seasons ADD COLUMN winner_count INT NOT NULL DEFAULT 1",
    "down": ""
}