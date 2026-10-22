// db.js — lapisan kompatibilitas SQLite berbasis sql.js (tanpa kompilasi native)
const path = require("path");
const fs = require("fs");
const initSqlJs = require("sql.js");

const DATA_DIR = path.join(__dirname, "data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const DB_PATH = process.env.DB_PATH || path.join(DATA_DIR, "restaurant-astro.db");
let database = null;
let transactionDepth = 0;

function persist() {
  if (!database || transactionDepth > 0) return;
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  fs.writeFileSync(DB_PATH, Buffer.from(database.export()));
}

function ensureReady() {
  if (!database) throw new Error("Database belum siap. Tunggu db.initialize() sebelum menjalankan server.");
}

const db = {
  async initialize() {
    if (database) return db;
    const SQL = await initSqlJs();
    if (fs.existsSync(DB_PATH)) {
      database = new SQL.Database(fs.readFileSync(DB_PATH));
    } else {
      database = new SQL.Database();
    }

    database.run("PRAGMA foreign_keys = ON");
    const schema = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8");
    database.exec(schema);
    persist();
    return db;
  },

  prepare(sql) {
    ensureReady();
    return {
      all(...params) {
        const statement = database.prepare(sql);
        try {
          if (params.length) statement.bind(params);
          const rows = [];
          while (statement.step()) rows.push(statement.getAsObject());
          return rows;
        } finally {
          statement.free();
        }
      },
      get(...params) {
        const statement = database.prepare(sql);
        try {
          if (params.length) statement.bind(params);
          return statement.step() ? statement.getAsObject() : undefined;
        } finally {
          statement.free();
        }
      },
      run(...params) {
        const statement = database.prepare(sql);
        let changes;
        try {
          statement.run(params);
          changes = database.getRowsModified();
        } finally {
          statement.free();
        }
        const row = database.exec("SELECT last_insert_rowid() AS id");
        const lastInsertRowid = row.length && row[0].values.length ? row[0].values[0][0] : 0;
        persist();
        return { changes, lastInsertRowid };
      }
    };
  },

  exec(sql) {
    ensureReady();
    database.exec(sql);
    persist();
  },

  transaction(callback) {
    return (...args) => {
      ensureReady();
      database.run("BEGIN");
      transactionDepth++;
      try {
        const result = callback(...args);
        database.run("COMMIT");
        transactionDepth--;
        persist();
        return result;
      } catch (error) {
        try { database.run("ROLLBACK"); } catch (_) { /* transaksi mungkin sudah ditutup */ }
        transactionDepth = Math.max(0, transactionDepth - 1);
        throw error;
      }
    };
  }
};

module.exports = db;
