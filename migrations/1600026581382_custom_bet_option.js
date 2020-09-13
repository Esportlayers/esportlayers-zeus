module.exports = {
    "up": "ALTER TABLE user ADD COLUMN `team_a_name` VARCHAR(191) NOT NULL DEFAULT 'a', ADD COLUMN `team_b_name` VARCHAR(191) NOT NULL DEFAULT 'b'",
    "down": ""
}