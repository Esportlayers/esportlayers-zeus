module.exports = {
    "up": "UPDATE bot_commands SET user_access=FALSE, sub_tier1_access=FALSE, sub_tier2_access=FALSE, sub_tier3_access=FALSE, vip_access=FALSE, mod_access=FALSE WHERE internal_identifier IN ('startbet', 'betwinner')",
    "down": ""
}