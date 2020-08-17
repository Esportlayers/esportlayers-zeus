import fs from 'fs';

const configTemplate = `"streamdota.com dota-gsi Configuration"
{
    "uri"               "https://api.streamdota.com/dota-gsi"
    "timeout"           "5.0"
    "buffer"            "0.1"
    "throttle"          "0.1"
    "heartbeat"         "10.0"
    "data"
    {
        "buildings"     "1"
        "provider"      "1"
        "map"           "1"
        "player"        "1"
        "hero"          "1"
        "abilities"     "1"
        "items"         "1"
        "draft"         "1"
        "wearables"     "0"
    }
    "auth"
    {
        "token"         "$AUTH_KEY$"
    }
}`;

export function generateConfig(authKey: string, userName: string): [string, string] {
    const content = configTemplate.replace('$AUTH_KEY$', authKey);
    const fileName = `gamestate_integration_streamdota-de-${userName.toLowerCase()}.cfg`;
    const path = __dirname + `/../../gsiConfigs/${fileName}`;
    fs.writeFileSync(path, content);
    return [fileName, path];
}