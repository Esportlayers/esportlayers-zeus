module.exports = {
    "up": (conn, cb) => {
        conn.query(`
            CREATE TABLE bet_overlays (
                user_id int PRIMARY KEY,
                font_family varchar(191) NOT NULL DEFAULT "Roboto",
                font_variant varchar(191) NOT NULL DEFAULT "400",
                distribution_background varchar(191) NOT NULL DEFAULT "rgba(0,0,0,.3)",
                distribution_font varchar(191) NOT NULL DEFAULT "#FFFFFF",
                distribution_font_size int NOT NULL DEFAULT 50,
                distribution_color_left varchar(191) NOT NULL DEFAULT "#CF1322",
                distribution_color_right varchar(191) NOT NULL DEFAULT "#389E0D",
                timer_background varchar(191) NOT NULL DEFAULT "rgba(0,0,0,.3)",
                timer_font varchar(191) NOT NULL DEFAULT "#FFFFFF",
                timer_font_size int NOT NULL DEFAULT 50,
                toplist_background varchar(191) NOT NULL DEFAULT "rgba(0,0,0,.3)",
                toplist_font varchar(191) NOT NULL DEFAULT "#FFFFFF",
                toplist_font_size int NOT NULL DEFAULT 50,
                toplist_show_rank boolean DEFAULT true,
                toplist_show_total_bets boolean DEFAULT true,
                toplist_show_accuracy boolean DEFAULT false
            );

            ALTER TABLE bet_overlays ADD FOREIGN KEY (user_id) REFERENCES user (id);
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

