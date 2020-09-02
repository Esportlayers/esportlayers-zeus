module.exports = {
    "up": "ALTER TABLE bet_overlays MODIFY COLUMN distribution_color_left varchar(191) NOT NULL DEFAULT '#389E0D', MODIFY COLUMN distribution_color_right varchar(191) NOT NULL DEFAULT '#CF1322';",
    "down": ""
}