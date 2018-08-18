process.env.NODE_ENV = 'test';

let crawler = require('../lib/crawler');
let db = require('../lib/database');
let config = require('../lib/config');
let Web3 = require('web3');
let chai = require('chai');
let SystemStore = require('../models/systemStore');

before(function(done) {
  // initialize test db before running tests.
  console.log('preparing test database..');
  this.timeout(10000);
  var web3 = new Web3(new Web3.providers.HttpProvider('http://localhost:8588'));

  db.connect(config.mongodbtest, function(){
    var initStore = new SystemStore({
      symbol: 'UBQ',
      timestamp: Date.now(),
      supply: '0',
      qwark: '964266346618165'
    });
    initStore.save(function(err) {
      crawler.init(web3, function(){
        crawler.sync(web3.eth.getBlock('160000'), 30, function() {
          console.log('test database ready. Starting tests..')
          done();
        });
      });
    });
  });
});

after(function(done) {
  // clean up test db after tests have completed
  db.purge(function(){
    db.disconnect();
    done();
  });
});
