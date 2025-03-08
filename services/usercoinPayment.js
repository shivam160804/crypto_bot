// File: services/usercoinPayment.js
const axios = require('axios');
const SPRING_BOOT_URL = process.env.SPRING_BOOT_URL || "http://localhost:1106";

/**
 * Process payment for an order using the Spring Boot API.
 * @param {number|string} orderId - The order ID to process payment for.
 * @param {string} authHeader - The Authorization header containing the token.
 * @returns {Promise<Object>} - The updated wallet data returned by Spring Boot.
 */
async function payOrderPayment(orderId, authHeader) {
  try {
    const response = await axios.put(
      `${SPRING_BOOT_URL}/api/wallet/order/${orderId}/pay`,
      null, // No request body required as per the API specification
      { headers: { Authorization: authHeader } }
    );
    return response.data;
  } catch (error) {
    console.error("Payment Error:", error.message);
    throw error;
  }
}

module.exports = { payOrderPayment };
