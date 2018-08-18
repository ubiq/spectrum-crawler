var mongoose = require('mongoose');

var blockSchema = mongoose.Schema({
  number: { type: Number, unique: true},
  timestamp: Number,
  transactions: Number,
  hash: {type: String, lowercase: true, unique: true},
  parentHash: {type: String, lowercase: true},
  sha3Uncles: {type: String, lowercase: true},
  miner: {type: String, lowercase: true},
  difficulty: String,
  totalDifficulty: String,
  size: Number,
  gasUsed: Number,
  gasLimit: Number,
  nonce: String,
  uncles: Number,
  blockReward: String,
  unclesReward: String,
  avgGasPrice: String,
  txFees: String,
  extraData: String
});

module.exports = mongoose.model('Blocks', blockSchema);
