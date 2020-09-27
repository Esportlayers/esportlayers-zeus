import dayjs from 'dayjs';
import config from '../../../config';
import { get, getObj, set, setObj } from '../../../loader/redis';
import { GsiClient } from '../../../middleware/dotaGsi';
import { sendMessage } from '../../websocket';
import { GameData, key as gameDatakey } from './game';

//#region <interfaces>
interface GsiHeroState {
    xpos:number;
    ypos:number;
    id:number;
    name:string;
    level:number;
    alive:boolean;
    respawn_seconds:number;
    buyback_cost:number;
    buyback_cooldown:number;
    health:number;
    max_health:number;
    health_percent:number;
    mana:number;
    max_mana:number;
    mana_percent:number;
    silenced:boolean;
    stunned:boolean;
    disarmed:boolean;
    magicimmune:boolean;
    hexed:boolean;
    muted:boolean;
    break:boolean;
    smoked:boolean;
    has_debuff:boolean;
    selected_unit:boolean;
    talent_1:boolean;
    talent_2:boolean;
    talent_3:boolean;
    talent_4:boolean;
    talent_5:boolean;
    talent_6:boolean;
    talent_7:boolean;
    talent_8:boolean;
}
interface GsiPlayerState {
    steamid: string;
    name: string;
    activity: string;
    kills: number;
    deaths: number;
    assists: number;
    last_hits: number;
    denies: number;
    kill_streak: number;
    commands_issued: number;
    kill_list:{
       [x: string]: number;
    },
    team_name: 'radiant' | 'dire';
    gold: number;
    gold_reliable: number;
    gold_unreliable: number;
    gold_from_hero_kills: number;
    gold_from_creep_kills: number;
    gold_from_income: number;
    gold_from_shared: number;
    gpm: number;
    xpm: number;
    net_worth: number;
    hero_damage: number;
    wards_purchased: number;
    wards_placed: number;
    wards_destroyed: number;
    runes_activated: number;
    camps_stacked: number;
    support_gold_spent: number;
    consumable_gold_spent: number;
    item_gold_spent: number;
    gold_lost_to_death: number;
    gold_spent_on_buybacks: number;
}

interface GsiPlayer {
    team2: {
        player0: GsiPlayerState;
        player1: GsiPlayerState;
        player2: GsiPlayerState;
        player3: GsiPlayerState;
        player4: GsiPlayerState;
    };
    team3: {
        player5: GsiPlayerState;
        player6: GsiPlayerState;
        player7: GsiPlayerState;
        player8: GsiPlayerState;
        player9: GsiPlayerState;
    };
}

interface GsiHero {
    team2: {
        player0: GsiHeroState;
        player1: GsiHeroState;
        player2: GsiHeroState;
        player3: GsiHeroState;
        player4: GsiHeroState;
    };
    team3: {
        player5: GsiHeroState;
        player6: GsiHeroState;
        player7: GsiHeroState;
        player8: GsiHeroState;
        player9: GsiHeroState;
    };
}

interface PlayerState {
    steamId: string;
    heroId: number;
    kills: number;
    deaths: number;
    assists: number;
    last_hits: number;
    denies: number;
    gold: number;
    gold_reliable: number;
    gold_unreliable: number;
    gold_from_hero_kills: number;
    gold_from_creep_kills: number;
    gold_from_income: number;
    gold_from_shared: number;
    gpm: number;
    xpm: number;
    net_worth: number;
    hero_damage: number;
    runes_activated: number;
    camps_stacked: number;
    support_gold_spent: number;
    consumable_gold_spent: number;
    item_gold_spent: number;
    gold_lost_to_death: number;
    gold_spent_on_buybacks: number;
    level: number;
    alive: boolean;
    respawn_seconds: number;
    buyback_cost: number;
    buyback_cooldown: number;
    health_percent: number;
    mana_percent: number;
    smoked: boolean;
    canBuyBack: boolean;
}
//#endregion

function key(userId: number): string {
    return `gsi_${userId}_player_state`;
}
function lastUpdateKey(userId: number): string {
    return `gsi_${userId}_player_state_last`;
}

function transformState(player: GsiPlayer, hero: GsiHero): PlayerState[] {
    const players = [];

    const rawPlayers = Object.values(player);
    const playerData: [string, GsiPlayerState][] = Object.entries({...rawPlayers[0], ...rawPlayers[1]});
    const rawHeroes = Object.values(hero);
    const heroData: {[x: string]: GsiHeroState} = {...rawHeroes[0], ...rawHeroes[1]};
    
    for(const [index, player] of playerData) {
        const playerHero = heroData[index];
        players.push({
            steamId: player.steamid,
            heroId: playerHero.id,
            kills: player.kills,
            deaths: player.deaths,
            assists: player.assists,
            last_hits: player.last_hits,
            denies: player.denies,
            gold: player.gold,
            gold_reliable: player.gold_reliable,
            gold_unreliable: player.gold_unreliable,
            gold_from_hero_kills: player.gold_from_hero_kills,
            gold_from_creep_kills: player.gold_from_creep_kills,
            gold_from_income: player.gold_from_income,
            gold_from_shared: player.gold_from_shared,
            gpm: player.gpm,
            xpm: player.xpm,
            net_worth: player.net_worth,
            hero_damage: player.hero_damage,
            runes_activated: player.runes_activated,
            camps_stacked: player.camps_stacked,
            support_gold_spent: player.support_gold_spent,
            consumable_gold_spent: player.consumable_gold_spent,
            item_gold_spent: player.item_gold_spent,
            gold_lost_to_death: player.gold_lost_to_death,
            gold_spent_on_buybacks: player.gold_spent_on_buybacks,
            level: playerHero.level,
            alive: playerHero.alive,
            respawn_seconds: playerHero.respawn_seconds,
            buyback_cost: playerHero.buyback_cost,
            buyback_cooldown: playerHero.buyback_cooldown,
            health_percent: playerHero.health_percent,
            mana_percent: playerHero.mana_percent,
            smoked: playerHero.smoked,
            canBuyBack: playerHero.buyback_cooldown === 0 && (playerHero.buyback_cost < player.gold)
        })

    }

    return players;
}

export async function process(client: GsiClient, data: any): Promise<void> {
    const gameData = await getObj<GameData>(gameDatakey(client.userId));
    const lastUpdate = await get(lastUpdateKey(client.userId));
    if(gameData && gameData.type === 'observing' && (!lastUpdate || +lastUpdate + 5 < dayjs().unix())) {
        const oldData = await getObj<PlayerState[]>(key(client.userId));
        const newPlayerState = data?.player as GsiPlayer | null;
        const newHeroState = data?.hero as GsiHero | null;
    
        if(newPlayerState && newHeroState) {
            const players = transformState(newPlayerState, newHeroState);
            sendMessage(client.userId, 'gsi_player_state', players);
            await setObj(key(client.userId), players);
            await set(lastUpdateKey(client.userId), '' + dayjs().unix());
        } else if(oldData) {
            await reset(client);
        }
    }
}

export async function reset(client: GsiClient): Promise<void> {
    config.debugGsi && console.log(`[${client.displayName}] Reseting player state`);
    await setObj(key(client.userId), null);
    sendMessage(client.userId, 'gsi_player_state', null);
}

export async function intializeNewConnection(userId: number): Promise<void> {
    const data = await getObj<PlayerState[]>(key(userId));
    if(data) {
        sendMessage(userId, 'gsi_player_state', data);
    }
}