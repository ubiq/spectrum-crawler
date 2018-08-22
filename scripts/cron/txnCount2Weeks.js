var config = require('../../lib/config');
var db = require('../../lib/database');
var lib = require('../../lib/common')
var Transaction = require('../../models/transaction');

function exit () {
  db.disconnect();
  process.exit(0);
}

const DAYS = 14; // 2 weeks
const SECONDS = 86400; // 1 day
const NOW = Date.now() / 1000;

var counts = [];

db.connect(config.mongodb, function () {
  lib.syncLoop(DAYS, function (loop) {
    var i = loop.iteration();
    var from = NOW - ((i+1) * SECONDS);
    var to = NOW - (i * SECONDS);
    Transaction.where('timestamp').gte(from).lte(to).countDocuments(function (err, count) {
      counts.push(count);
      loop.next();
    });
  }, function () {
    db.updateStoreTxnCounts(counts.reverse(), function () {
      exit();
    });
  });
});
