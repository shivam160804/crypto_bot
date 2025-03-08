// File: routes/usercoins.js
const express = require('express');
const axios = require('axios');
const db = require('../db/db');
const blockchain = require('../services/blockchain');

const router = express.Router();

const SPRING_BOOT_URL = process.env.SPRING_BOOT_URL || "https://cryptonex-backend.onrender.com";

// Helper function to fetch user profile from Spring Boot
async function fetchUserProfile(authHeader) {
  try {
    const response = await axios.get(`${SPRING_BOOT_URL}/api/users/profile`, {
      headers: { Authorization: authHeader }
    });
    return response.data;
  } catch (error) {
    console.log("Profile Fetch Error:", error.message);
    return null;
  }
}

// POST /usercoins/create
// Create a new coin with details provided as JSON, then mint the coin on our custom blockchain.
router.post('/create', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const profile = await fetchUserProfile(authHeader);
    if (!profile) {
      return res.status(401).json({ error: "User not authorized." });
    }
    const userId = profile.id;

    // Expect JSON payload
    const { coin_name, coin_symbol, price, quantity, volume, coin_picture } = req.body;

    // Basic validation
    if (!coin_name || !coin_symbol || !price || !quantity || !volume) {
      return res.status(400).json({ error: 'All fields (coin_name, coin_symbol, price, quantity, volume) are required.' });
    }

    // Insert coin data into the usercoins table (coin_picture can be a URL or Base64 string)
    const insertQuery = `
      INSERT INTO usercoins (user_id, coin_name, coin_symbol, coin_picture, price, quantity, volume)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    db.run(insertQuery, [userId, coin_name, coin_symbol, coin_picture || null, price, quantity, volume], function(err) {
      if (err) {
        console.error("Error inserting coin:", err.message);
        return res.status(500).json({ error: 'Internal server error.' });
      }
      
      // Construct coin data for blockchain simulation
      const coinData = {
        coin_id: this.lastID,
        user_id: userId,
        coin_name,
        coin_symbol,
        price,
        quantity,
        volume
      };

      // Mint the coin on our custom blockchain simulation
      blockchain.mintCoin(coinData).then((blockchainId) => {
        // Update the coin record with the blockchain identifier in the contract_address field
        const updateQuery = `UPDATE usercoins SET contract_address = ? WHERE coin_id = ?`;
        db.run(updateQuery, [blockchainId, this.lastID], (err2) => {
          if (err2) {
            console.error("Error updating coin with blockchain ID:", err2.message);
            return res.status(500).json({ error: 'Coin created but failed to update blockchain info.' });
          }
          return res.status(201).json({
            message: 'Coin created and minted successfully.',
            coin: {
              coin_id: coinData.coin_id,
              user_id: userId,
              coin_name,
              coin_symbol,
              coin_picture: coin_picture || null,
              price,
              quantity,
              volume,
              blockchain_id: blockchainId
            }
          });
        });
      }).catch((error) => {
        console.error("Blockchain minting error:", error.message);
        return res.status(500).json({ error: 'Coin created but blockchain minting failed.' });
      });
    });
  } catch (error) {
    console.error("Error in /create:", error.message);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

// NEW Endpoint: GET /usercoins/all
// Retrieve all coins, regardless of who created them
router.get('/all', async (req, res) => {
  try {
    // Optionally verify token for authorized requests
    const authHeader = req.headers.authorization;
    const profile = await fetchUserProfile(authHeader);
    if (!profile) {
      return res.status(401).json({ error: "User not authorized." });
    }
    const selectQuery = `SELECT * FROM usercoins`;
    db.all(selectQuery, [], (err, rows) => {
      if (err) {
        console.error("Error fetching all coins:", err.message);
        return res.status(500).json({ error: 'Internal server error.' });
      }
      return res.json({ coins: rows });
    });
  } catch (error) {
    console.error("Error in GET /all:", error.message);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

// GET /usercoins
// Retrieve all coins created by the authenticated user
router.get('/', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const profile = await fetchUserProfile(authHeader);
    if (!profile) {
      return res.status(401).json({ error: "User not authorized." });
    }
    const userId = profile.id;
    const selectQuery = `SELECT * FROM usercoins WHERE user_id = ?`;
    db.all(selectQuery, [userId], (err, rows) => {
      if (err) {
        console.error("Error fetching coins:", err.message);
        return res.status(500).json({ error: 'Internal server error.' });
      }
      return res.json({ coins: rows });
    });
  } catch (error) {
    console.error("Error in GET /:", error.message);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

// GET /usercoins/:coinId
// Retrieve details for a specific coin regardless of who created it
router.get('/:coinId', async (req, res) => {
  try {
    // Optionally verify token for authorized requests
    const authHeader = req.headers.authorization;
    const profile = await fetchUserProfile(authHeader);
    if (!profile) {
      return res.status(401).json({ error: "User not authorized." });
    }
    const { coinId } = req.params;
    // Removed filtering by user_id so that any coin can be retrieved
    const selectQuery = `SELECT * FROM usercoins WHERE coin_id = ?`;
    db.get(selectQuery, [coinId], (err, row) => {
      if (err) {
        console.error("Error fetching coin:", err.message);
        return res.status(500).json({ error: 'Internal server error.' });
      }
      if (!row) {
        return res.status(404).json({ error: 'Coin not found.' });
      }
      return res.json({ coin: row });
    });
  } catch (error) {
    console.error("Error in GET /:coinId:", error.message);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;
