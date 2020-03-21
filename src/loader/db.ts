import mysql from 'mysql2/promise';
import config from './../config';
import { Connection } from 'mysql2/promise';

export async function getConn(): Promise<Connection> {
    const conn = await mysql.createConnection(config.mysql);
    await conn.execute(`SET sql_mode=(SELECT REPLACE(@@sql_mode,'ONLY_FULL_GROUP_BY',''))`);
    return conn;
}
