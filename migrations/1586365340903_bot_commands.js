module.exports = {
    "up": (conn, cb) => {
        conn.query(`
            CREATE TABLE bot_commands (
                id int PRIMARY KEY AUTO_INCREMENT,
                user_id int,
                command varchar(191) NOT NULL,
                message varchar(191) NOT NULL,
                isStatic boolean
            );
            ALTER TABLE bot_commands ADD FOREIGN KEY (user_id) REFERENCES user (id);
            ALTER TABLE user ADD COLUMN command_trigger varchar(1) NOT NULL DEFAULT "!";
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
            DROP TABLE bot_commands;
            ALTER TABLE user DROP command_trigger;
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