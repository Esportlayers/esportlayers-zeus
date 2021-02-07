module.exports = {
    "up": "ALTER TABLE user ADD COLUMN individual_overlay_vote_distribution BOOLEAN NOT NULL DEFAULT FALSE, ADD COLUMN individual_overlay_vote_toplist BOOLEAN NOT NULL DEFAULT FALSE, ADD COLUMN individual_overlay_vote_timer BOOLEAN NOT NULL DEFAULT FALSE, ADD COLUMN individual_overlay_wl_stats BOOLEAN NOT NULL DEFAULT FALSE, ADD COLUMN individual_overlay_minimap BOOLEAN NOT NULL DEFAULT FALSE, ADD COLUMN individual_overlay_draft_stats BOOLEAN NOT NULL DEFAULT FALSE, ADD COLUMN individual_overlay_hero_stats BOOLEAN NOT NULL DEFAULT FALSE;",
    "down": ""
}