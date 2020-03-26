import d2gsi, { Client} from 'dota2-gsi';
import config from '../config';
import {green, grey} from 'chalk';

const server = new d2gsi({port: +config.gsiPort});

export function handleNewGSIClient(client: Client) {
    console.log(grey('[Dota-GSI] New client successfully authorized'));
}

server.events.on('newclient', handleNewGSIClient);
console.log(green('Dota-GSI started on port: ' + config.gsiPort));