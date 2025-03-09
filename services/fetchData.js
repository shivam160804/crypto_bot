const axios = require("axios");
const db = require("../db/db");
require("dotenv").config();

const COINGECKO_API_URL = "https://api.coingecko.com/api/v3/coins/markets";
const API_KEY = "CG-yYW28XmphrN4nEcu8dyd4JCm";


/**
 * Fetch and store latest crypto prices
 */
async function fetchCryptoPrices() {
    try {
        console.log("🔄 Fetching latest crypto prices...");

        const response = await axios.get(COINGECKO_API_URL, {
            params: {
                vs_currency: "usd",
                order: "market_cap_desc",
                per_page: 250, // Fetch top 250 coins
                page: 1,
                price_change_percentage: "24h",
                x_cg_api_key: API_KEY
            }
        });

        const coins = response.data;

        if (!coins || coins.length === 0) {
            console.log("❌ No coin data received.");
            return;
        }

        const stmt = db.prepare(`
            INSERT INTO crypto_prices (symbol, name, price, market_cap, volume_24h, change_24h, last_updated)
            VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(symbol) DO UPDATE SET
                price = excluded.price,
                market_cap = excluded.market_cap,
                volume_24h = excluded.volume_24h,
                change_24h = excluded.change_24h,
                last_updated = CURRENT_TIMESTAMP;
        `);

        db.serialize(() => {
            coins.forEach(coin => {
                stmt.run(
                    coin.symbol.toUpperCase(),
                    coin.name,
                    coin.current_price,
                    coin.market_cap,
                    coin.total_volume,
                    coin.price_change_percentage_24h
                );
            });
        });

        stmt.finalize();
        console.log("✅ Crypto prices updated successfully.");

    } catch (error) {
        console.error("❌ Error fetching crypto prices:", error.message);
    }
}

module.exports = { fetchCryptoPrices };
