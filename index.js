require("dotenv").config();
const express = require("express");
const cors = require("cors");

// Initialize Express app
const app = express();
app.use(express.json()); // ✅ Required to parse JSON body
app.use(cors());

const fs = require('fs');
const path = require('path');

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
  console.log('Uploads folder created.');
}


// Import routes
const chatRoutes = require("./routes/chat");


const usercoinsRoutes = require('./routes/usercoins');
const usercoinPortfolioRoutes = require('./routes/usercoinPortfolio');
app.use('/usercoins', usercoinsRoutes);
app.use('/usercoinPortfolio', usercoinPortfolioRoutes);

// Use routes
app.use("/chat", chatRoutes);


// Import and start cron jobs
require("./cron/jobs");



// Define a simple home route
app.get("/", (req, res) => {
    res.send("🚀 AI Bot is running...");
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
});
