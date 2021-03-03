module.exports = {
  up:
    "ALTER TABLE user ADD COLUMN use_keyword_listener_overlay BOOLEAN NOT NULL DEFAULT FALSE",
  down: "",
};
