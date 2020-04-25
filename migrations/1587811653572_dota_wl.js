module.exports = {
    "up": (conn, cb) => {
        conn.query(`
            ALTER TABLE dota_overlays DROP background_orientation;
            ALTER TABLE user ADD COLUMN gsi_connected boolean NOT NULL DEFAULT false;
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

