module.exports = {
    "up": (conn, cb) => {
        conn.query(`
            CREATE TABLE anti_snipe_overlay (
                user_id int PRIMARY KEY,
                type varchar(191) NOT NULL DEFAULT "normal",
                opacity VARCHAR(191) NOT NULL DEFAULT "100"
            );

            ALTER TABLE anti_snipe_overlay ADD FOREIGN KEY (user_id) REFERENCES user (id);
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

