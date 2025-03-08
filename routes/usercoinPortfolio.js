// File: routes/usercoinPortfolio.js
const express = require('express');
const axios = require('axios');
const db = require('../db/db');

const router = express.Router();
const SPRING_BOOT_URL = process.env.SPRING_BOOT_URL || "http://localhost:1106";

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

// Dummy function to simulate fetching wallet data (for example, balance)
async function fetchUserWallet(authHeader) {
  // Simulated wallet data with a balance of 10,000 units
  return { id: 999, balance: 1000000 };
}

// GET /usercoinPortfolio
// Retrieve portfolio details (coins bought by the authenticated user)
// Now the endpoint does not require the userId in the URL.
router.get('/', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const profile = await fetchUserProfile(authHeader);
    if (!profile) {
      return res.status(401).json({ error: "User not authorized." });
    }
    const userId = profile.id;
    const selectQuery = `
      SELECT h.holding_id, h.quantity, h.average_price, 
             c.coin_id, c.coin_name, c.coin_symbol, c.coin_picture, c.price, c.volume, c.contract_address
      FROM usercoin_holdings h
      INNER JOIN usercoins c ON h.coin_id = c.coin_id
      WHERE h.user_id = ?
    `;
    db.all(selectQuery, [userId], (err, rows) => {
      if (err) {
        console.error("Error fetching portfolio:", err.message);
        return res.status(500).json({ error: "Internal server error." });
      }
      return res.json({ portfolio: rows });
    });
  } catch (error) {
    console.error("Error in GET /portfolio:", error.message);
    return res.status(500).json({ error: "Internal server error." });
  }
});

// POST /usercoinPortfolio/buy
// Process the purchase of a coin by checking the wallet balance and updating usercoin_holdings.
router.post('/buy', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const profile = await fetchUserProfile(authHeader);
    if (!profile) {
      return res.status(401).json({ error: "User not authorized." });
    }
    const userId = profile.id;
    const { coin_id, quantity, price } = req.body;
    if (!coin_id || !quantity || !price) {
      return res.status(400).json({ error: "coin_id, quantity, and price are required." });
    }
    
    // Simulate wallet check
    const wallet = await fetchUserWallet(authHeader);
    const purchaseCost = parseFloat(price) * parseFloat(quantity);
    if (purchaseCost > wallet.balance) {
      return res.status(400).json({ error: "Insufficient wallet balance to buy." });
    }
    
    console.log(`Simulated wallet balance before purchase: ${wallet.balance}`);
    console.log(`Purchase cost: ${purchaseCost}`);
    
    // Check if the holding already exists for this coin
    const selectQuery = `SELECT * FROM usercoin_holdings WHERE user_id = ? AND coin_id = ?`;
    db.get(selectQuery, [userId, coin_id], (err, row) => {
      if (err) {
        console.error("Error checking holdings:", err.message);
        return res.status(500).json({ error: "Internal server error." });
      }
      if (row) {
        // Update existing holding: increment quantity and recalculate average price
        const newQuantity = parseFloat(row.quantity) + parseFloat(quantity);
        const newAvgPrice = ((parseFloat(row.average_price) * parseFloat(row.quantity)) + (parseFloat(price) * parseFloat(quantity))) / newQuantity;
        const updateQuery = `UPDATE usercoin_holdings SET quantity = ?, average_price = ?, updated_at = CURRENT_TIMESTAMP WHERE holding_id = ?`;
        db.run(updateQuery, [newQuantity, newAvgPrice, row.holding_id], function(err2) {
          if (err2) {
            console.error("Error updating holdings:", err2.message);
            return res.status(500).json({ error: "Internal server error." });
          }
          return res.json({ message: "Holding updated successfully.", holding_id: row.holding_id });
        });
      } else {
        // Insert a new holding record
        const insertQuery = `INSERT INTO usercoin_holdings (user_id, coin_id, quantity, average_price) VALUES (?, ?, ?, ?)`;
        db.run(insertQuery, [userId, coin_id, quantity, price], function(err3) {
          if (err3) {
            console.error("Error inserting holding:", err3.message);
            return res.status(500).json({ error: "Internal server error." });
          }
          return res.status(201).json({ message: "Coin bought successfully.", holding_id: this.lastID });
        });
      }
    });
  } catch (error) {
    console.error("Error in POST /buy:", error.message);
    return res.status(500).json({ error: "Internal server error." });
  }
});

// POST /usercoinPortfolio/sell
// Process selling a coin from the user's holdings by updating or deleting the holding record.
router.post('/sell', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const profile = await fetchUserProfile(authHeader);
    if (!profile) {
      return res.status(401).json({ error: "User not authorized." });
    }
    const userId = profile.id;
    const { coin_id, quantity, price } = req.body;
    if (!coin_id || !quantity || !price) {
      return res.status(400).json({ error: "coin_id, quantity, and price are required." });
    }
    
    // Check if the holding exists for this coin
    const selectQuery = `SELECT * FROM usercoin_holdings WHERE user_id = ? AND coin_id = ?`;
    db.get(selectQuery, [userId, coin_id], (err, row) => {
      if (err) {
        console.error("Error checking holdings:", err.message);
        return res.status(500).json({ error: "Internal server error." });
      }
      if (!row) {
        return res.status(404).json({ error: "No holdings found for this coin." });
      }
      if (parseFloat(row.quantity) < parseFloat(quantity)) {
        return res.status(400).json({ error: "Insufficient quantity to sell." });
      }
      const newQuantity = parseFloat(row.quantity) - parseFloat(quantity);
      if (newQuantity > 0) {
        // Update holding with new quantity
        const updateQuery = `UPDATE usercoin_holdings SET quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE holding_id = ?`;
        db.run(updateQuery, [newQuantity, row.holding_id], function(err2) {
          if (err2) {
            console.error("Error updating holding:", err2.message);
            return res.status(500).json({ error: "Internal server error." });
          }
          return res.json({ message: "Coin sold successfully. Holding updated." });
        });
      } else {
        // Delete holding if quantity becomes zero
        const deleteQuery = `DELETE FROM usercoin_holdings WHERE holding_id = ?`;
        db.run(deleteQuery, [row.holding_id], function(err3) {
          if (err3) {
            console.error("Error deleting holding:", err3.message);
            return res.status(500).json({ error: "Internal server error." });
          }
          return res.json({ message: "Coin sold successfully. Holding removed." });
        });
      }
    });
  } catch (error) {
    console.error("Error in POST /sell:", error.message);
    return res.status(500).json({ error: "Internal server error." });
  }
});

module.exports = router;
