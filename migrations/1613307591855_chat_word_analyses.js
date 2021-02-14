module.exports = {
    "up": (conn, cb) => {
        conn.query(`
            CREATE TABLE word_groups (
                id int PRIMARY KEY AUTO_INCREMENT,
                user_id int NOT NULL,
                active boolean NOT NULL DEFAULT TRUE,
                name varchar(191) NOT NULL
            );
            
            CREATE TABLE words (
                id int PRIMARY KEY AUTO_INCREMENT,
                word_group_id int,
                word varchar(191) NOT NULL,
                use_sentiment_analysis boolean NOT NULL DEFAULT TRUE
            );
            
            CREATE TABLE word_messages (
                id int PRIMARY KEY AUTO_INCREMENT,
                word_id int,
                message mediumtext NOT NULL,
                visibility int NOT NULL DEFAULT 0,
                chatter int NOT NULL DEFAULT 0,
                sentiment_score float DEFAULT null,
                sentiment_magnitude float DEFAULT null
            );
            
            ALTER TABLE word_messages ADD FOREIGN KEY (word_id) REFERENCES words (id);
            
            ALTER TABLE words ADD FOREIGN KEY (word_group_id) REFERENCES word_groups (id);

            ALTER TABLE word_groups ADD FOREIGN KEY (user_id) REFERENCES user (id);
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
  