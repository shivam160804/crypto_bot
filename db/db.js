const sqlite3 = require("sqlite3").verbose();
const path = require("path");

// Define database file path
const DB_PATH = path.join(__dirname, "../database.sqlite");

// Connect to SQLite database
const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error("❌ Database connection failed:", err.message);
    } else {
        console.log("✅ Connected to SQLite database.");
    }
});

// Enable foreign keys
db.run("PRAGMA foreign_keys = ON;");

module.exports = db;
