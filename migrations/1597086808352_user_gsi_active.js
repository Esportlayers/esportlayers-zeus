module.exports = {
    "up": (conn, cb) => {
        conn.query(`
            ALTER TABLE user ADD COLUMN gsi_active boolean NOT NULL DEFAULT false;
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

