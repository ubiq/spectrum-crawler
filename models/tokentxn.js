var mongoose = require('mongoose');

var tokenTransferSchema = mongoose.Schema({
  blockNumber: { type: Number, index: true },
  hash: { type: String, lowercase: true, unique: true },
  timestamp: Number,
  from: {type: String, lowercase: true, index: true},
  to: {type: String, lowercase: true, index: true},
  value: String,
  contract: {type: String, lowercase: true, index: true},
  method: {type: String, lowercase: true}
});

module.exports = mongoose.model('TokenTransfers', tokenTransferSchema);
