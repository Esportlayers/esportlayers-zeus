module.exports = {
    "up": (conn, cb) => {
        conn.query(`
            ALTER TABLE user ADD COLUMN gsi_auth varchar(191) NOT NULL;

            CREATE TABLE steam_connections (
                id int PRIMARY KEY AUTO_INCREMENT,
                user_id int,
                steam_id varchar(191) NOT NULL
            );
            
            CREATE TABLE dota_overlays (
                id int PRIMARY KEY AUTO_INCREMENT,
                user_id int,
                api_key varchar(191) NOT NULL,
                font_family varchar(191) NOT NULL,
                font_variant varchar(191) NOT NULL,
                font_size int,
                show_divider boolean,
                divider_correction int,
                divider_color varchar(191) NOT NULL,
                number_spacing int,
                win_color varchar(191) NOT NULL,
                loss_color varchar(191) NOT NULL,
                show_background boolean,
                background_orientation varchar(191) NOT NULL,
                background_top_spacing int,
                background_left_spacing int
            );
            
            ALTER TABLE dota_overlays ADD FOREIGN KEY (user_id) REFERENCES user (id);
            ALTER TABLE steam_connections ADD FOREIGN KEY (user_id) REFERENCES user (id);
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
            ALTER TABLE user DROP gsi_auth;
            DROP TABLE steam_connections;
            DROP TABLE dota_overlays;
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