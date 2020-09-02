module.exports = {
    "up": "ALTER TABLE bet_overlays ADD COLUMN distribution_numbers BOOLEAN NOT NULL DEFAULT FALSE",
    "down": ""
}