module.exports = {
    "up": "ALTER TABLE user ADD COLUMN `created` datetime NOT NULL DEFAULT NOW(), ADD COLUMN `status` enum('active', 'disabled') NOT NULL DEFAULT 'active'",
    "down": ""
}