module.exports = {
    "up": (conn, cb) => {
        conn.query(`
            CREATE TABLE dota_games (
                id int PRIMARY KEY AUTO_INCREMENT,
                user_id int,
                finished datetime,
                won boolean
            );
            ALTER TABLE dota_games ADD FOREIGN KEY (user_id) REFERENCES user (id);
        `, (err) => {
            if(err) {
                console.error(err);
                throw err;
            } else {
                cb();
            }
        })
    },
    "down": "DROP TABLE dota_games"
}