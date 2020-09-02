module.exports = {
    "up": "ALTER TABLE bet_overlays ADD COLUMN toplist_max_number INT NOT NULL DEFAULT 10",
    "down": ""
}