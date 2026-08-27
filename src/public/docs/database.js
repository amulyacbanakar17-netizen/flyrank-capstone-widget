const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");

// Create a data folder if it doesn't exist
const dataDir = path.join(__dirname, "..", "data");

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir);
}

// Create/connect to the SQLite database
const db = new Database(path.join(dataDir, "flyrank.db"));

// Enable foreign key protection
db.pragma("foreign_keys = ON");
// Create the widgets table
db.exec(`
  CREATE TABLE IF NOT EXISTS widgets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    owner_id TEXT NOT NULL,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    button_text TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`);

// Create the submissions table
db.exec(`
  CREATE TABLE IF NOT EXISTS submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    widget_id INTEGER NOT NULL,
    data TEXT NOT NULL,
    ip_address TEXT,
    country TEXT,
    city TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (widget_id) REFERENCES widgets(id)
  )
`);
console.log("Database connected successfully!");

module.exports = db;
