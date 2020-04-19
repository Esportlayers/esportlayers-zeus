module.exports = {
    "up": (conn, cb) => {
        conn.query(`
            ALTER TABLE user DROP use_channel_bot, DROP command_trigger;
            ALTER TABLE bot_commands DROP isStatic, ADD COLUMN active BOOLEAN NOT NULL DEFAULT TRUE, ADD COLUMN type ENUM ('default', 'dotaWinLoss', 'betting') NOT NULL DEFAULT 'default', ADD COLUMN access ENUM ('streamer', 'mod', 'user');
            
            CREATE TABLE bot_timer (id int PRIMARY KEY AUTO_INCREMENT, user_id int, period int NOT NULL, message varchar(191) NOT NULL, active boolean); 
            ALTER TABLE bot_timer ADD FOREIGN KEY (id) REFERENCES user (id);
        `, (err) => {
            if(err) {
                console.error(err);
                throw err;
            } else {
                cb();
            }
        })
    },
    "down": "",
}