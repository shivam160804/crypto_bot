const db = require("./db");

// Create tables
db.serialize(() => {
    // Create crypto_prices table
    db.run(`
        CREATE TABLE IF NOT EXISTS crypto_prices (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            symbol TEXT NOT NULL UNIQUE,  -- ✅ Made symbol UNIQUE
            name TEXT NOT NULL,
            price REAL NOT NULL,
            market_cap BIGINT,
            volume_24h BIGINT,
            change_24h REAL,
            last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `);

    // Create crypto_news table with UNIQUE constraint on url
    db.run(`
        CREATE TABLE IF NOT EXISTS crypto_news (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            url TEXT NOT NULL UNIQUE,  -- ✅ Made url UNIQUE
            source TEXT NOT NULL,
            published_at DATETIME NOT NULL,
            sentiment TEXT NOT NULL,
            sentiment_score REAL NOT NULL
        );
    `);

    console.log("✅ Tables created successfully.");
});





// Create the 'usercoins' table to store coins created by users
const createUserCoinsTable = `
  CREATE TABLE IF NOT EXISTS usercoins (
    coin_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    coin_name TEXT NOT NULL,
    coin_symbol TEXT NOT NULL UNIQUE,
    coin_picture TEXT,
    price REAL NOT NULL,
    quantity REAL NOT NULL,
    volume REAL NOT NULL,
    contract_address TEXT
  );
`;

db.run(createUserCoinsTable, (err) => {
  if (err) {
    console.error("Error creating usercoins table:", err.message);
  } else {
    console.log("usercoins table created or already exists.");
  }
});

// Create the 'usercoin_holdings' table to track coins bought by users (portfolio)
const createUserCoinHoldingsTable = `
  CREATE TABLE IF NOT EXISTS usercoin_holdings (
    holding_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    coin_id INTEGER NOT NULL,
    quantity REAL NOT NULL,
    average_price REAL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (coin_id) REFERENCES usercoins(coin_id)
  );
`;

db.run(createUserCoinHoldingsTable, (err) => {
  if (err) {
    console.error("Error creating usercoin_holdings table:", err.message);
  } else {
    console.log("usercoin_holdings table created or already exists.");
  }
});




// Close the database connection (optional for migrations)
db.close();
