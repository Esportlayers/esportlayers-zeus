module.exports = {
    "up": (conn, cb) => {
        conn.query(`
            ALTER TABLE user ADD COLUMN dota_stats_from ENUM ('session', 'day'), ADD COLUMN bet_season_id int;
            ALTER TABLE user ADD FOREIGN KEY (bet_season_id) REFERENCES bet_seasons (id);
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
            ALTER TABLE user DROP FOREIGN KEY user_ibfk_1;
            ALTER TABLE user DROP dota_stats_from, DROP bet_season_id;
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