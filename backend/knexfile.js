const path = require('path');

const sqliteFilename = process.env.SQLITE_FILENAME
  || (process.env.RAILWAY_VOLUME_MOUNT_PATH
    ? path.join(process.env.RAILWAY_VOLUME_MOUNT_PATH, 'database.sqlite3')
    : path.resolve(__dirname, 'database.sqlite3'));

module.exports = {
  development: {
    client: 'sqlite3',
    connection: {
      filename: sqliteFilename
    },
    useNullAsDefault: true,
    pool: {
      afterCreate: (conn, cb) => {
        conn.run('PRAGMA foreign_keys = ON', cb);
      }
    }
  }
};
