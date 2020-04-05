module.exports = {
    "up": (conn, cb) => {
        conn.query(`
            CREATE UNIQUE INDEX twitch_index_1 ON user (twitch_id);
            CREATE TABLE user_stream_state (twitch_id int PRIMARY KEY, online boolean, viewer int, created datetime, title varchar(191) NOT NULL, game varchar(191) NOT NULL, preview varchar(191) NOT NULL, preview_webp varchar(191) NOT NULL, preview_jp2 varchar(191) NOT NULL);
            ALTER TABLE user_stream_state ADD FOREIGN KEY (twitch_id) REFERENCES user (twitch_id);
        `, (err) => {
            if(err) {
                console.error(err);
                throw err;
            } else {
                cb();
            }
        })
    },
    "down": (conn, cb) => {
        conn.query(`
            DROP TABLE user_stream_state;
            DROP INDEX twitch_index_1 ON user;
        `, (err) => {
            if(err) {
                console.error(err);
                throw err;
            } else {
                cb();
            }
        })
    },
}