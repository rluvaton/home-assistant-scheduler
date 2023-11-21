import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * @type { Object.<string, import("knex").Knex.Config> }
 */
const config = {
  development: {
    client: 'sqlite3',
    connection: {
      filename: path.join(__dirname, './dev.sqlite3')
    },

    migrations: {
      tableName: 'knex_migrations'
    },
    useNullAsDefault: true
  },
  test: {
    client: 'sqlite3',
    connection: {
      filename: path.join(__dirname, './test.sqlite3')
    },

    migrations: {
      tableName: 'knex_migrations'
    },
    useNullAsDefault: true
  },
  production: {
    client: 'sqlite3',

    connection: {
      // /data folder is persistent across addon restarts
      filename: '/data/db.sqlite3'
    },

    migrations: {
      tableName: 'knex_migrations'
    },

    useNullAsDefault: true
  }
};

export default config[process.env.NODE_ENV || 'development'];
