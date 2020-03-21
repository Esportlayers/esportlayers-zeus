module.exports = {
    "up": "CREATE TABLE user (id int NOT NULL AUTO_INCREMENT, twitch_id int NOT NULL, display_name varchar(191) NOT NULL, avatar varchar(191) NOT NULL, avatar_webp varchar(191) NOT NULL, avatar_jp2 varchar(191) NOT NULL, profile_url varchar(191) NOT NULL, PRIMARY KEY (id))",
    "down": "DROP TABLE IF EXISTS user;",
}
