var mongoose = require('mongoose');

var systemSchema = mongoose.Schema({
  timestamp: Number,
  symbol: String,
  supply: String,
  latestBlock: Object,
  price: String,
  txnCounts: Object
});

module.exports = mongoose.model('sysStore', systemSchema);
