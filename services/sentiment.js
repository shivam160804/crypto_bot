const axios = require("axios");
const db = require("../db/db");
const vader = require("vader-sentiment");
require("dotenv").config();

const CRYPTOPANIC_API_URL = "https://cryptopanic.com/api/v1/posts/";
const API_KEY = process.env.CRYPTOPANIC_API_KEY;

/**
 * Fetch and store latest crypto news with sentiment analysis
 */
async function fetchCryptoNews() {
    try {
        console.log("🔄 Fetching latest crypto news...");

        const response = await axios.get(CRYPTOPANIC_API_URL, {
            params: {
                auth_token: API_KEY,
                kind: "news",
                public: "true"
            }
        });

        const articles = response.data.results;

        if (!articles || articles.length === 0) {
            console.log("❌ No news articles received.");
            return;
        }

        const stmt = db.prepare(`
            INSERT INTO crypto_news (title, url, source, published_at, sentiment, sentiment_score)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(url) DO UPDATE SET
                sentiment = excluded.sentiment,
                sentiment_score = excluded.sentiment_score;
        `);

        db.serialize(() => {
            articles.forEach(article => {
                const title = article.title || "Unknown Title";
                const url = article.url;
                const source = article.source.title || "Unknown Source";
                const publishedAt = article.published_at;

                // Perform Sentiment Analysis
                const sentimentScore = vader.SentimentIntensityAnalyzer.polarity_scores(title).compound;
                let sentiment = "neutral";
                if (sentimentScore > 0.05) sentiment = "positive";
                else if (sentimentScore < -0.05) sentiment = "negative";

                stmt.run(title, url, source, publishedAt, sentiment, sentimentScore);
            });
        });

        stmt.finalize();
        console.log("✅ Crypto news updated successfully.");

    } catch (error) {
        console.error("❌ Error fetching crypto news:", error.message);
    }
}

module.exports = { fetchCryptoNews };
