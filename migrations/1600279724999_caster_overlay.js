module.exports = {
    "up": (conn, cb) => {
        conn.query(`
            CREATE TABLE caster_overlays (
                user_id int PRIMARY KEY,
                font_family varchar(191) NOT NULL DEFAULT "Roboto",
                font_variant varchar(191) NOT NULL DEFAULT "400",
                background varchar(191) NOT NULL DEFAULT "rgba(0,0,0,.3)"
            );

            ALTER TABLE caster_overlays ADD FOREIGN KEY (user_id) REFERENCES user (id);
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

