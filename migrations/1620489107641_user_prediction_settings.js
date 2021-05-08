module.exports = {
    "up": "ALTER TABLE user ADD COLUMN use_predictions boolean DEFAULT FALSE, ADD COLUMN prediction_duration INT DEFAULT 90",
    "down": ""
}