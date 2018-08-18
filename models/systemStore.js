var mongoose = require('mongoose');

var systemSchema = mongoose.Schema({
  timestamp: Number,
  symbol: String,
  supply: String,
  latestBlock: Object,
  price: String
});

module.exports = mongoose.model('sysStore', systemSchema);
