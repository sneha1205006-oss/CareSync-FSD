const path = require('path');
const fs = require('fs');

let Database;
let isNodeSqlite = false;

try {
  const sqlite = require('node:sqlite');
  if (sqlite && sqlite.DatabaseSync) {
    Database = sqlite.DatabaseSync;
    isNodeSqlite = true;
  }
} catch (e) {
  // node:sqlite not available
}

if (!Database) {
  Database = require('better-sqlite3');
}

const dataDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = process.env.DATABASE_PATH || path.join(dataDir, 'hospital.db');
const db = new Database(dbPath);

if (isNodeSqlite) {
  db.pragma = function (pragmaStr) {
    return db.exec(`PRAGMA ${pragmaStr};`);
  };
}

// Enable foreign keys and Write-Ahead Logging for high performance
db.pragma('foreign_keys = ON');
db.pragma('journal_mode = WAL');

// Initialize schema
const schemaPath = path.join(__dirname, '../db/schema.sql');
if (fs.existsSync(schemaPath)) {
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');
  db.exec(schemaSql);
}

module.exports = db;
