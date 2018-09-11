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
const now = new Date()
var yesterday = new Date(now.setDate(now.getDate() -1)).toUTCString();
var arr = yesterday.split(' ');
arr[4] = '00:00:00'
const EOD = new Date(arr.join(' ')).getTime() / 1000 // End of Day

var counts = [];
var dates = [];

db.connect(config.mongodb, function () {
  lib.syncLoop(DAYS, function (loop) {
    var i = loop.iteration();
    var from = EOD - ((i+1) * SECONDS);
    var to = EOD - (i * SECONDS);
    Transaction.where('timestamp').gte(from).lte(to).countDocuments(function (err, count) {
      counts.push(count);
      var date = new Date(to * 1000);
      dates.push(date.getDate() + '/' + (date.getMonth() + 1))
      loop.next();
    });
  }, function () {
    db.updateStoreTxnCounts({
      data: counts.reverse(),
      labels: dates.reverse()
    }, function () {
      exit();
    });
  });
});
