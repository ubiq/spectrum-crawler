var mongoose = require('mongoose');

var transactionSchema = mongoose.Schema({
  blockHash: { type: String, lowercase: true},
  blockNumber: { type: Number, index: true },
  hash: { type: String, lowercase: true, unique: true },
  timestamp: Number,
  input: String,
  value: String,
  gas: Number,
  gasUsed: Number,
  gasPrice: String,
  nonce: Number,
  transactionIndex: Number,
  from: {type: String, lowercase: true, index: true},
  to: {type: String, lowercase: true, index: true},
  contractAddress: {type: String, lowercase: true},
  logs: Array
});

module.exports = mongoose.model('Transactions', transactionSchema);
