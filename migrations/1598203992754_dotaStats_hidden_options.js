module.exports = {
    "up": "ALTER TABLE user ADD COLUMN dota_stats_menu_hidden boolean NOT NULL DEFAULT false, ADD COLUMN dota_stats_pick_hidden boolean NOT NULL DEFAULT false",
    "down": ""
}