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
        "buildings"     "0"
        "provider"      "0"
        "map"           "1"
        "player"        "1"
        "hero"          "0"
        "abilities"     "0"
        "items"         "0"
        "draft"         "0"
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