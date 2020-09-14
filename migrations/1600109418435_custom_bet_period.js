module.exports = {
    "up": "ALTER TABLE bet_overlays ADD COLUMN timer_duration INT NOT NULL DEFAULT 90",
    "down": ""
}