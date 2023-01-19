/**
 *                          Blockchain Class
 *  The Blockchain class contain the basics functions to create your own private blockchain
 *  It uses libraries like `crypto-js` to create the hashes for each block and `bitcoinjs-message`
 *  to verify a message signature. The chain is stored in the array
 *  `this.chain = [];`. Of course each time you run the application the chain will be empty because and array
 *  isn't a persisten storage method.
 *
 */

const SHA256 = require("crypto-js/sha256");
const BlockClass = require("./block.js");
const bitcoinMessage = require("bitcoinjs-message");

class Blockchain {
  /**
   * Constructor of the class, you will need to setup your chain array and the height
   * of your chain (the length of your chain array).
   * Also everytime you create a Blockchain class you will need to initialized the chain creating
   * the Genesis Block.
   * The methods in this class will always return a Promise to allow client applications or
   * other backends to call asynchronous functions.
   */
  constructor() {
    this.chain = [];
    this.height = -1;
    this.initializeChain();
  }

  /**
   * This method will check for the height of the chain and if there isn't a Genesis Block it will create it.
   * You should use the `addBlock(block)` to create the Genesis Block
   * Passing as a data `{data: 'Genesis Block'}`
   */
  async initializeChain() {
    if (this.height === -1) {
      try {
        let block = new BlockClass.Block({ data: "Genesis Block" });
        await this._addBlock(block);
      } catch (error) {
        console.log(error);
      }
    }
  }

  /**
   * Utility method that return a Promise that will resolve with the height of the chain
   */
  getChainHeight() {
    return new Promise((resolve, reject) => {
      resolve(this.height);
    });
  }

  /**
   * _addBlock(block) will store a block in the chain
   * @param {*} block
   * The method will return a Promise that will resolve with the block added
   * or reject if an error happen during the execution.
   * You will need to check for the height to assign the `previousBlockHash`,
   * assign the `timestamp` and the correct `height`...At the end you need to
   * create the `block hash` and push the block into the chain array. Don't for get
   * to update the `this.height`
   * Note: the symbol `_` in the method name indicates in the javascript convention
   * that this method is a private method.
   */
  _addBlock(block) {
    let self = this;

    return new Promise(async (resolve, reject) => {
      try {
        // Destructure the required variables from self
        const { chain, height } = self;

        /**
         * If the chain is not empty, get the hash from the last block to use as the previousBlockHash.
         * The genesis block will have no previousBlockHash because it is the first in the chain
         */
        console.log({ chain, height });
        if (chain.length > 0) {
          const lastBlock = chain[height];
          console.log({ lastBlock });
          block.previousBlockHash = lastBlock.hash;
        }

        // Increment the current chain height by 1 to get the height of the new block
        const newBlockHeight = height + 1;
        block.height = newBlockHeight;

        // Get the current timestamp
        block.time = new Date().getTime().toString().slice(0, -3);

        // Use sha256 encoding to get the hash of the block data
        block.hash = SHA256(JSON.stringify(block)).toString();

        // Update the classes height and chain which should include the new block
        self.height = newBlockHeight;
        self.chain = [...chain, block];

        // Validate the chain and reject with any errors
        const validateErrors = await self.validateChain();
        if (validateErrors.length > 0) {
          reject(validateErrors);
        }

        // Resolve the newly created block
        resolve(block);
      } catch (error) {
        // Catch any errors and reject the promise
        reject(error);
      }
    });
  }

  /**
   * The requestMessageOwnershipVerification(address) method
   * will allow you  to request a message that you will use to
   * sign it with your Bitcoin Wallet (Electrum or Bitcoin Core)
   * This is the first step before submit your Block.
   * The method return a Promise that will resolve with the message to be signed
   * @param {*} address
   */
  requestMessageOwnershipVerification(address) {
    return new Promise((resolve) => {
      // Use template literals to construct the message using address provided and current timestamp (seconds)
      const message = `${address}:${new Date()
        .getTime()
        .toString()
        .slice(0, -3)}:starRegistry`;

      // Resolve with the resulting message
      resolve(message);
    });
  }

  /**
   * The submitStar(address, message, signature, star) method
   * will allow users to register a new Block with the star object
   * into the chain. This method will resolve with the Block added or
   * reject with an error.
   * Algorithm steps:
   * 1. Get the time from the message sent as a parameter example: `parseInt(message.split(':')[1])`
   * 2. Get the current time: `let currentTime = parseInt(new Date().getTime().toString().slice(0, -3));`
   * 3. Check if the time elapsed is less than 5 minutes
   * 4. Veify the message with wallet address and signature: `bitcoinMessage.verify(message, address, signature)`
   * 5. Create the block and add it to the chain
   * 6. Resolve with the block added.
   * @param {*} address
   * @param {*} message
   * @param {*} signature
   * @param {*} star
   */
  submitStar(address, message, signature, star) {
    let self = this;
    return new Promise(async (resolve, reject) => {
      try {
        // Parse the timestamp from the message
        const time = parseInt(message.split(":")[1]);

        // Get the current timestamp (seconds)
        let currentTime = parseInt(
          new Date().getTime().toString().slice(0, -3)
        );

        // If current time is 5 minutes (300 seconds) greater than the message time reject with error
        if (currentTime - time > 300) {
          reject(
            "The signature is more than 5 minutes old so will not be used"
          );
        }

        // Validate the message using bitcoinMessage module
        const validMessage = bitcoinMessage.verify(message, address, signature);

        // If the message is not valid reject with an error
        if (!validMessage) {
          reject("The message is not valid!");
        }

        // If the message is valid initialize a new block
        let block = new BlockClass.Block({ address, message, signature, star });

        // Try to add the block to the chain and resolve with the new block
        const createdBlock = await self._addBlock(block);
        resolve(createdBlock);
      } catch (error) {
        // Catch any errors and reject the promise
        reject(error);
      }
    });
  }

  /**
   * This method will return a Promise that will resolve with the Block
   *  with the hash passed as a parameter.
   * Search on the chain array for the block that has the hash.
   * @param {*} hash
   */
  getBlockByHash(hash) {
    let self = this;
    return new Promise((resolve, reject) => {
      try {
        // Find the block in the array that matches the hash provided
        const block = self.chain.find((block) => block.hash === hash);

        // If a matching block is found, resolve with the block or reject with an error
        if (block) {
          resolve(block);
        }
        reject("Hash not found in current chain");
      } catch (error) {
        // Catch any errors and reject the promise
        reject(error);
      }
    });
  }

  /**
   * This method will return a Promise that will resolve with the Block object
   * with the height equal to the parameter `height`
   * @param {*} height
   */
  getBlockByHeight(height) {
    let self = this;
    return new Promise((resolve, reject) => {
      // Find the block in the array that matches the height provided
      let block = self.chain.find((p) => p.height === height);

      // If a matching block is found, resolve with the block or resolve null
      if (block) {
        resolve(block);
      } else {
        resolve(null);
      }
    });
  }

  /**
   * This method will return a Promise that will resolve with an array of Stars objects existing in the chain
   * and are belongs to the owner with the wallet address passed as parameter.
   * Remember the star should be returned decoded.
   * @param {*} address
   */
  getStarsByWalletAddress(address) {
    let self = this;
    let stars = [];
    return new Promise((resolve, reject) => {
      try {
        // Loop through blocks in the chain and push ones matching the provided address to stars array
        self.chain.forEach(async (block) => {
          const blockBody = await block.getBData();
          console.log({ address });
          if (blockBody.address === address) {
            stars.push({ owner: address, star: blockBody.star });
          }
        });

        // Resolve with an array of stars from blocks that match the provided address
        resolve(stars);
      } catch (error) {
        // Catch any errors and reject the promise
        reject(error);
      }
    });
  }

  /**
   * This method will return a Promise that will resolve with the list of errors when validating the chain.
   * Steps to validate:
   * 1. You should validate each block using `validateBlock`
   * 2. Each Block should check the with the previousBlockHash
   */
  validateChain() {
    let self = this;
    let errorLog = [];
    return new Promise(async (resolve, reject) => {
      try {
        self.chain.forEach((block) => {
          console.log(block);
          // Validate block using the the method on the Block class
          const blockValid = block.validate();

          // If the block is not valid push an error to the errorLog array
          if (!blockValid) {
            errorLog.push(`Block ${height} is not valid!`);
          }

          // If block is genesis there is no need to check the previous block hash
          if (block.height === 0) {
            return;
          }

          /**
           * Check that the current blocks 'previousBlockHash' value equals
           * the 'hash' in the previous block in the chain
           */
          const isNextBlock =
            self.chain.find(
              (previousBlock) => previousBlock.hash === block.previousBlockHash
            )?.height ===
            block.height - 1;

          // If the hashes do not match push an error to the errorLog array
          if (!isNextBlock) {
            errorLog.push(
              `Chain is broken at Block ${block.height}. It's 'previousBlockHash' is different to the previous blocks hash!`
            );
          }
        });

        // Resolve with the array of error messages
        resolve(errorLog);
      } catch (error) {
        // Catch any errors and reject the promise
        reject(error);
      }
    });
  }
}

module.exports.Blockchain = Blockchain;
