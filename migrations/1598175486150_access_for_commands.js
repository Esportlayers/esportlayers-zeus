module.exports = {
    "up": (conn, cb) => {
        conn.query(`
            ALTER TABLE bot_commands 
                DROP COLUMN access, 
                ADD COLUMN user_access boolean NOT NULL DEFAULT true,
                ADD COLUMN sub_tier1_access boolean NOT NULL DEFAULT true,
                ADD COLUMN sub_tier2_access boolean NOT NULL DEFAULT true,
                ADD COLUMN sub_tier3_access boolean NOT NULL DEFAULT true,
                ADD COLUMN vip_access boolean NOT NULL DEFAULT true,
                ADD COLUMN mod_access boolean NOT NULL DEFAULT true,
                ADD COLUMN streamer_access boolean NOT NULL DEFAULT true;
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

