const crypto = require('crypto');

/**
 * Computes the Merkle root for an array of transactions.
 * If the array is empty, returns an empty string.
 * @param {Array} transactions 
 * @returns {string} The Merkle root.
 */
function computeMerkleRoot(transactions) {
  if (!transactions || transactions.length === 0) return '';

  // Helper function to hash a string using SHA256
  const hashData = (data) => crypto.createHash('sha256').update(data).digest('hex');

  // Create initial leaves
  let leaves = transactions.map(tx => hashData(JSON.stringify(tx)));

  // Iteratively compute the Merkle root
  while (leaves.length > 1) {
    if (leaves.length % 2 !== 0) {
      // Duplicate last hash if odd number of leaves
      leaves.push(leaves[leaves.length - 1]);
    }
    const newLeaves = [];
    for (let i = 0; i < leaves.length; i += 2) {
      newLeaves.push(hashData(leaves[i] + leaves[i + 1]));
    }
    leaves = newLeaves;
  }
  return leaves[0];
}

// Block class representing a block in the blockchain
class Block {
  /**
   * @param {number} index - The block's index in the chain.
   * @param {number} timestamp - Unix timestamp in seconds.
   * @param {any} data - Block data (can be an array of transactions or any object).
   * @param {string} previousHash - The previous block's hash.
   * @param {string} version - Block version.
   */
  constructor(index, timestamp, data, previousHash = '', version = "1.0") {
    this.index = index;
    this.timestamp = timestamp;
    this.data = data;
    this.previousHash = previousHash;
    this.nonce = 0;
    this.version = version;
    this.salt = crypto.randomBytes(8).toString('hex'); // Extra random salt
    // Compute merkleRoot: if data is an array, use Merkle tree; otherwise hash the JSON
    this.merkleRoot = Array.isArray(data)
      ? computeMerkleRoot(data)
      : crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
    this.hash = this.calculateHash();
  }

  /**
   * Calculates the block's hash based on its header fields.
   * @returns {string} The block hash.
   */
  calculateHash() {
    const dataToHash =
      this.index +
      this.previousHash +
      this.timestamp +
      this.merkleRoot +
      this.nonce +
      this.version +
      this.salt;
    return crypto.createHash('sha256').update(dataToHash).digest('hex');
  }

  /**
   * Mines the block by incrementing the nonce until the hash meets the difficulty target.
   * @param {number} difficulty - The number of leading zeros required.
   */
  mineBlock(difficulty) {
    const target = Array(difficulty + 1).join("0");
    while (this.hash.substring(0, difficulty) !== target) {
      this.nonce++;
      this.hash = this.calculateHash();
    }
    console.log(`Block mined: ${this.hash}`);
  }
}

// Blockchain class to manage the chain
class Blockchain {
  constructor() {
    this.chain = [this.createGenesisBlock()];
    this.difficulty = 3; // Starting difficulty
    this.blockTime = 10; // Expected time per block in seconds
    this.adjustmentInterval = 10; // Adjust difficulty every 10 blocks
  }

  /**
   * Creates the genesis (first) block of the blockchain.
   * @returns {Block} The genesis block.
   */
  createGenesisBlock() {
    return new Block(0, Math.floor(Date.now() / 1000), "Genesis Block", "0");
  }

  /**
   * Returns the latest block in the chain.
   * @returns {Block} The latest block.
   */
  getLatestBlock() {
    return this.chain[this.chain.length - 1];
  }

  /**
   * Adds a new block to the chain after mining.
   * @param {Block} newBlock 
   */
  addBlock(newBlock) {
    newBlock.previousHash = this.getLatestBlock().hash;
    newBlock.mineBlock(this.difficulty);
    this.chain.push(newBlock);

    // Adjust difficulty every adjustmentInterval blocks
    if (this.chain.length % this.adjustmentInterval === 0) {
      this.adjustDifficulty();
    }
  }

  /**
   * Adjusts the difficulty based on time taken to mine the last adjustmentInterval blocks.
   */
  adjustDifficulty() {
    const latestBlock = this.getLatestBlock();
    const prevAdjustmentBlock = this.chain[this.chain.length - this.adjustmentInterval];
    const timeExpected = this.blockTime * this.adjustmentInterval;
    const timeTaken = latestBlock.timestamp - prevAdjustmentBlock.timestamp;
    if (timeTaken < timeExpected / 2) {
      this.difficulty++;
      console.log(`Increasing difficulty to ${this.difficulty}`);
    } else if (timeTaken > timeExpected * 2 && this.difficulty > 1) {
      this.difficulty--;
      console.log(`Decreasing difficulty to ${this.difficulty}`);
    } else {
      console.log(`Difficulty remains at ${this.difficulty}`);
    }
  }

  /**
   * Verifies the integrity of the blockchain.
   * @returns {boolean} True if valid, false otherwise.
   */
  isChainValid() {
    for (let i = 1; i < this.chain.length; i++) {
      const currentBlock = this.chain[i];
      const previousBlock = this.chain[i - 1];
      if (currentBlock.hash !== currentBlock.calculateHash()) {
        return false;
      }
      if (currentBlock.previousHash !== previousBlock.hash) {
        return false;
      }
    }
    return true;
  }
}

// Create a single instance of our blockchain for coin minting transactions
const coinBlockchain = new Blockchain();

/**
 * Simulates minting a coin on our custom blockchain.
 * This function creates a block with the coin's data (including extra metadata),
 * mines the block, adds it to our blockchain ledger, and returns its hash.
 * @param {Object} coinData - Data related to the coin being minted.
 * @returns {Promise<string>} - A simulated blockchain identifier (the block's hash).
 */
function mintCoin(coinData) {
  return new Promise((resolve) => {
    // Prepare block data; we wrap coinData in an object for clarity.
    const blockData = {
      type: "coin_minting",
      coin: coinData,
      extra: {
        mintedAt: Date.now(),
        randomFactor: Math.random(),
      }
    };

    // Create a new block using current index and Unix timestamp (in seconds)
    const newBlock = new Block(
      coinBlockchain.chain.length,
      Math.floor(Date.now() / 1000),
      blockData,
      coinBlockchain.getLatestBlock().hash
    );

    // Mine and add the block to the blockchain ledger
    newBlock.mineBlock(coinBlockchain.difficulty);
    coinBlockchain.addBlock(newBlock);

    // Return the block's hash as the coin's blockchain identifier
    resolve(newBlock.hash);
  });
}

/* 
 * Basic Smart Contract Implementation
 *
 * In this simplified model, a smart contract is represented as an object with:
 * - code: an object where keys are function names and values are functions
 * - state: an object representing the contract's persistent storage
 * - address: a unique identifier generated from the code and initial state
 *
 * The SmartContractEngine maintains a registry of deployed contracts.
 */

class SmartContract {
  /**
   * @param {object} code - An object representing the contract's functions.
   * @param {object} initialState - Initial state for the contract.
   */
  constructor(code, initialState = {}) {
    this.code = code; // Object containing functions as contract methods
    this.state = initialState;
    // Generate a unique address from the stringified code, state, and a random salt.
    const salt = crypto.randomBytes(4).toString('hex');
    const hashInput = JSON.stringify(code) + JSON.stringify(initialState) + salt;
    this.address = crypto.createHash('sha256').update(hashInput).digest('hex');
  }

  /**
   * Executes a contract method.
   * @param {string} method - The method name to execute.
   * @param {Array} args - Arguments to pass to the method.
   * @returns {any} - The result of the contract execution.
   */
  execute(method, args) {
    if (typeof this.code[method] === 'function') {
      // The method receives the contract's state as the first argument.
      const result = this.code[method](this.state, ...args);
      return result;
    } else {
      throw new Error(`Method ${method} not found in contract.`);
    }
  }
}

class SmartContractEngine {
  constructor() {
    this.contracts = {}; // Registry mapping addresses to SmartContract instances.
  }

  /**
   * Deploys a new smart contract.
   * @param {object} contractCode - The code object for the contract.
   * @param {object} initialState - The initial state of the contract.
   * @returns {string} - The contract address.
   */
  deploy(contractCode, initialState = {}) {
    const contract = new SmartContract(contractCode, initialState);
    this.contracts[contract.address] = contract;
    console.log(`Contract deployed at address: ${contract.address}`);
    return contract.address;
  }

  /**
   * Calls a method on a deployed contract.
   * @param {string} address - The contract's address.
   * @param {string} method - The method name to call.
   * @param {Array} args - Arguments for the method.
   * @returns {any} - The result of the method execution.
   */
  call(address, method, args = []) {
    const contract = this.contracts[address];
    if (!contract) {
      throw new Error(`Contract not found at address: ${address}`);
    }
    return contract.execute(method, args);
  }
}

// Create a single instance of our smart contract engine
const contractEngine = new SmartContractEngine();

module.exports = { mintCoin, coinBlockchain, contractEngine };
