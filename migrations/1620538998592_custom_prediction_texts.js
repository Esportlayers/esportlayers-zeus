module.exports = {
    "up": "ALTER TABLE user ADD COLUMN prediction_playing_title VARCHAR(191) DEFAULT 'Will I win?', ADD COLUMN prediction_playing_option_a VARCHAR(191) DEFAULT 'Yes', ADD COLUMN prediction_playing_option_b VARCHAR(191) DEFAULT 'No', ADD COLUMN prediction_observing_title VARCHAR(191) DEFAULT 'Who will win?', ADD COLUMN prediction_observing_option_a VARCHAR(191) DEFAULT 'Radiant', ADD COLUMN prediction_observing_option_b VARCHAR(191) DEFAULT 'Dire'",
    "down": ""
}