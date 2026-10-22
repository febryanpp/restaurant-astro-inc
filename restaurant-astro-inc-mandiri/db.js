const path = require("path");
const fs = require("fs");
const initSqlJs = require("sql.js");

let database = null;

function ensureReady() {
  if (!database) {
    throw new Error("Database belum siap. Jalankan db.initialize() terlebih dahulu.");
  }
}

const db = {
  async initialize() {
    if (database) return db;

    const SQL = await initSqlJs({
      locateFile: (file) => {
        return require.resolve(`sql.js/dist/${file}`);
      }
    });

    database = new SQL.Database();

    database.run("PRAGMA foreign_keys = ON");

    const schemaPath = path.join(__dirname, "schema.sql");
    const schema = fs.readFileSync(schemaPath, "utf8");

    database.exec(schema);

    return db;
  },

  prepare(sql) {
    ensureReady();

    return {
      all(...params) {
        const statement = database.prepare(sql);

        try {
          if (params.length) {
            statement.bind(params);
          }

          const rows = [];

          while (statement.step()) {
            rows.push(statement.getAsObject());
          }

          return rows;
        } finally {
          statement.free();
        }
      },

      get(...params) {
        const statement = database.prepare(sql);

        try {
          if (params.length) {
            statement.bind(params);
          }

          return statement.step()
            ? statement.getAsObject()
            : undefined;
        } finally {
          statement.free();
        }
      },

      run(...params) {
        const statement = database.prepare(sql);

        try {
          statement.run(params);
        } finally {
          statement.free();
        }

        const changes = database.getRowsModified();

        const result = database.exec(
          "SELECT last_insert_rowid() AS id"
        );

        const lastInsertRowid =
          result.length &&
          result[0].values.length
            ? result[0].values[0][0]
            : 0;

        return {
          changes,
          lastInsertRowid
        };
      }
    };
  },

  exec(sql) {
    ensureReady();
    database.exec(sql);
  },

  transaction(callback) {
    return (...args) => {
      ensureReady();

      database.run("BEGIN");

      try {
        const result = callback(...args);

        database.run("COMMIT");

        return result;
      } catch (error) {
        try {
          database.run("ROLLBACK");
        } catch (_) {}

        throw error;
      }
    };
  }
};

module.exports = db;
