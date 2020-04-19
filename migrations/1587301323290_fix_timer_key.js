module.exports = {
    "up": (conn, cb) => {
        conn.query(`
        ALTER TABLE bot_timer DROP FOREIGN KEY bot_timer_ibfk_1;
        ALTER TABLE bot_timer ADD FOREIGN KEY (user_id) REFERENCES user (id);
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