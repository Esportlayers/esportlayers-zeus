module.exports = {
    "up": (conn, cb) => {
        conn.query(`
            CREATE TABLE twitch_user_scopes_access (
                id int PRIMARY KEY AUTO_INCREMENT,
                user_id int NOT NULL,
                scope varchar(191) NOT NULL,
                access_token varchar(191) NOT NULL,
                refresh_token varchar(191) NOT NULL
            );

            ALTER TABLE twitch_user_scopes_access ADD FOREIGN KEY (user_id) REFERENCES user (id);
        `, (err) => {
            if (err) {
                console.error(err);
                throw err;
            } else {
                cb();
            }
        })
    },
    "down": ""
}
