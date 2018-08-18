var config = require('../lib/config');
var db = require('../lib/database');

function exit() {
  db.disconnect();
  process.exit(0);
}

db.connect(config.mongodb, function() {
  db.purge(function(){
    exit();
  });
});
