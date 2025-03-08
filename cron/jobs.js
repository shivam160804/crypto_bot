const cron = require("node-cron");
const { fetchCryptoPrices } = require("../services/fetchData");
const { fetchCryptoNews } = require("../services/sentiment");

console.log("⏳ Cron jobs initialized...");

// ✅ Fetch crypto prices every 11 minutes
cron.schedule("*/11 * * * *", async () => {
    console.log("⏳ Running crypto price update...");
    await fetchCryptoPrices();
});

// ✅ Fetch crypto news every hour
cron.schedule("0 * * * *", async () => {
    console.log("⏳ Running crypto news update...");
    await fetchCryptoNews();
});

console.log("✅ Cron jobs scheduled.");
