var mongoose = require('mongoose');

var uncleSchema = mongoose.Schema({
  number: Number,
  position: Number,
  blockNumber: Number,
  hash: {type: String, lowercase: true, unique: true},
  parentHash: {type: String, lowercase: true},
  sha3Uncles: {type: String, lowercase: true},
  miner: {type: String, lowercase: true},
  difficulty: String,
  gasLimit: Number,
  gasUsed: Number,
  timestamp: Number,
  reward: String
});

module.exports = mongoose.model('Uncles', uncleSchema);
