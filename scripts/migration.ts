var mysql = require('mysql2');
var migration = require('mysql-migrations');
var dotenv = require('dotenv');
dotenv.config();

var connection = mysql.createPool({
  connectionLimit : 15,
  host: process.env.MYSQL_HOST || 'localhost',
  user: process.env.MYSQL_USER ||  'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'app',
  multipleStatements: true
});

migration.init(connection, __dirname + '/../migrations');
