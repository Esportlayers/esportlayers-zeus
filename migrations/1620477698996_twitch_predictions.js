module.exports = {
    "up": "CREATE TABLE twitch_predictions (id varchar(191) PRIMARY KEY, outcome_a varchar(191) NOT NULL, outcome_b varchar(191) NOT NULL);",
    "down": ""
}
