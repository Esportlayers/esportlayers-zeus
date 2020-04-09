module.exports = {
    "up": (conn, cb) => {
        conn.query(`
          CREATE TABLE watchers (
            id int PRIMARY KEY AUTO_INCREMENT,
            user_id int,
            twitch_id int,
            display_name varchar(191),
            username varchar(191),
            watchtime bigint(20)
          );
          
          CREATE TABLE bets (
            id int PRIMARY KEY AUTO_INCREMENT,
            watcher_id int,
            bet_round_id int,
            created datetime,
            bet varchar(191) NOT NULL
          );
          
          CREATE TABLE bet_seasons (
            id int PRIMARY KEY AUTO_INCREMENT,
            name varchar(191),
            description text,
            type ENUM ('ladder', 'tournament', 'other')
          );
          
          CREATE TABLE bet_season_invites (
            bet_season_id int,
            user_id int,
            invite_key varchar(40),
            created datetime,
            status ENUM ('open', 'accepted', 'denied')
          );
          
          CREATE TABLE bet_season_users (
            bet_season_id int,
            user_id int,
            userRole ENUM ('owner', 'editor', 'user')
          );
          
          CREATE TABLE bet_rounds (
            id int PRIMARY KEY AUTO_INCREMENT,
            bet_season_id int,
            user_id int,
            round int,
            created datetime,
            status ENUM ('betting', 'running', 'finished'),
            result varchar(191) NOT NULL
          );

          ALTER TABLE watchers ADD FOREIGN KEY (user_id) REFERENCES user (id);
          ALTER TABLE bets ADD FOREIGN KEY (watcher_id) REFERENCES watchers (id);
          ALTER TABLE bets ADD FOREIGN KEY (bet_round_id) REFERENCES bet_rounds (id);
          ALTER TABLE bet_season_invites ADD FOREIGN KEY (user_id) REFERENCES user (id);
          ALTER TABLE bet_season_invites ADD FOREIGN KEY (bet_season_id) REFERENCES bet_seasons (id);
          ALTER TABLE bet_season_users ADD FOREIGN KEY (bet_season_id) REFERENCES bet_seasons (id);
          ALTER TABLE bet_season_users ADD FOREIGN KEY (user_id) REFERENCES user (id);
          ALTER TABLE bet_rounds ADD FOREIGN KEY (user_id) REFERENCES user (id);
          ALTER TABLE bet_rounds ADD FOREIGN KEY (bet_season_id) REFERENCES bet_seasons (id);
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
            DROP TABLE bets;
            DROP TABLE bet_rounds;
            DROP TABLE bet_season_users;
            DROP TABLE bet_season_invites;
            DROP TABLE bet_seasons;
            DROP TABLE watchers;
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