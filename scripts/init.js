var config = require('../lib/config');
var db = require('../lib/database');
var SystemStore = require('../models/systemStore');

function exit() {
  db.disconnect();
  process.exit(0);
}

db.connect(config.mongodb, function() {
  var initStore = new SystemStore({
    symbol: 'UBQ',
    timestamp: Date.now(),
    supply: '36108073197716300000000000',
    qwark: '964266346618165'
  });
  initStore.save(function(err) {
    if (err)
      throw err;
    exit();
  });
});
