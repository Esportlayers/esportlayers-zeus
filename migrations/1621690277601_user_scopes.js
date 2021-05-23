module.exports = {
    "up": (conn, cb) => {
        conn.query(`
            CREATE TABLE user_scopes (
                user_id int PRIMARY KEY NOT NULL,
                scoped_user_id int NOT NULL,
                status VARCHAR(191) DEFAULT 'requested',
                api_key VARCHAR(191) NOT NULL
            );

            ALTER TABLE user_scopes ADD FOREIGN KEY (user_id) REFERENCES user (id);
            ALTER TABLE user_scopes ADD FOREIGN KEY (scoped_user_id) REFERENCES user (id);
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
