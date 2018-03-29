const PgPromice = require('pg-promise');

const connectionOptions = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD
};

const pgp = PgPromice();

// TODO: remove this hack
// Modifies returned timestamps
pgp.pg.types.setTypeParser(1114, s => s + 'Z');

const db = pgp(connectionOptions);

module.exports = db;
