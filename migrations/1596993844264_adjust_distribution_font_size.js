module.exports = {
    "up": (conn, cb) => {
        conn.query(`
            ALTER TABLE bet_overlays MODIFY distribution_font_size int NOT NULL DEFAULT 25;
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

