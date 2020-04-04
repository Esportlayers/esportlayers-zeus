module.exports = {
    "up": (conn, cb) => {
        conn.query(`
            DROP TABLE IF EXISTS dota_overlays;
            CREATE TABLE dota_overlays (
                id int PRIMARY KEY AUTO_INCREMENT,
                user_id int,
                font varchar(191) NOT NULL,
                variant varchar(191) NOT NULL,
                font_size int,
                win_color varchar(191) NOT NULL,
                divider_color varchar(191) NOT NULL,
                loss_color varchar(191) NOT NULL,
                show_background boolean,
                background_orientation varchar(191) NOT NULL,
                winX int,
                winY int,
                lossX int,
                lossY int,
                dividerX int,
                dividerY int
            );
            ALTER TABLE dota_overlays ADD FOREIGN KEY (user_id) REFERENCES user (id);
        `, (err) => {
            if(err) {
                console.error(err);
                throw err;
            } else {
                cb();
            }
        })
    },
    "down": "DROP TABLE dota_overlays;"
}