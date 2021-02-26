module.exports = {
    "up": "ALTER TABLE dota_overlays ADD COLUMN always_visible BOOLEAN NOT NULL DEFAULT FALSE, ADD COLUMN no_animation BOOLEAN NOT NULL DEFAULT FALSE",
    "down": ""
}