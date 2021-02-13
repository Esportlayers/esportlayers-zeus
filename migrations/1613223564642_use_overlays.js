module.exports = {
    "up": `ALTER TABLE user ADD COLUMN individual_rosh_timer_overlay BOOLEAN NOT NULL DEFAULT FALSE, 
                            ADD COLUMN use_dota_stats_overlay BOOLEAN NOT NULL DEFAULT FALSE,
                            ADD COLUMN use_minimap_overlay BOOLEAN NOT NULL DEFAULT FALSE,
                            ADD COLUMN use_roshan_timer_overlay BOOLEAN NOT NULL DEFAULT FALSE,
                            ADD COLUMN use_draft_stats_overlay BOOLEAN NOT NULL DEFAULT FALSE,
                            ADD COLUMN use_hero_stats_overlay BOOLEAN NOT NULL DEFAULT FALSE,
                            ADD COLUMN use_vote_toplist_overlay BOOLEAN NOT NULL DEFAULT FALSE,
                            ADD COLUMN use_vote_timer_overlay BOOLEAN NOT NULL DEFAULT FALSE,
                            ADD COLUMN use_vote_distribution_overlay BOOLEAN NOT NULL DEFAULT FALSE;`,
    "down": ""
}











