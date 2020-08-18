module.exports = {
    "up": (conn, cb) => {
        conn.query(`
            CREATE TABLE rosh_overlays (
                id int PRIMARY KEY AUTO_INCREMENT,
                user_id int,
                font varchar(191) NOT NULL,
                variant varchar(191) NOT NULL,
                font_size int,
                aegis_color varchar(191) NOT NULL,
                base_color varchar(191) NOT NULL,
                variable_color varchar(191) NOT NULL
            );
            ALTER TABLE rosh_overlays ADD FOREIGN KEY (user_id) REFERENCES user (id);

        `, (err) => {
            if(err) {
                console.error(err);
                throw err;
            } else {
                cb();
            }
        })
    },
    "down": ""
}

