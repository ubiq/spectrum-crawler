var mongoose = require('mongoose');
var Block = require('../models/block');
var ForkedBlock = require('../models/forkedBlock');
var Transaction = require('../models/transaction');
var TokenTransfer = require('../models/tokentxn');
var SystemStore = require('../models/systemStore');
var Uncle = require('../models/uncle');

module.exports = {

  connect: function(dbparams, cb) {
    var dbstring = 'mongodb://' + dbparams.user;
    dbstring = dbstring + ':' + dbparams.password;
    dbstring = dbstring + '@' + dbparams.address;
    dbstring = dbstring + ':' + dbparams.port;
    dbstring = dbstring + '/' + dbparams.database;

    mongoose.connect(dbstring, { useNewUrlParser: true }, function(err) {
      if (err) {
        console.log('Unable to connect to database: %s', dbstring);
        console.log('Aborting');
        process.exit(1);

      }
      console.log('Successfully connected to database: %s', dbparams.database);
      return cb();
    });
  },

  disconnect: function(){
    mongoose.disconnect();
  },

  purge: function(cb) {
    Block.remove({}, function(err){
      Transaction.remove({}, function(err){
        Uncle.remove({}, function(err){
          SystemStore.remove({}, function(err){
            return cb();
          });
        });
      });
    });
  },

  reorgPurge: function(blockNumber, cb) {
    Block.remove({number: blockNumber}, function(err){
      Transaction.remove({blockNumber: blockNumber}, function(err){
        TokenTransfer.remove({blockNumber: blockNumber}, function(err){
          Uncle.remove({blockNumber:blockNumber}, function(err){
            return cb();
          });
        });
      });
    });
  },

  // BLOCKS

  // store block in db
  addBlock: function(params, cb) {
    var newBlock = new Block(params);
    newBlock.save(function(err) {
      if (err) {
        return cb(err)
      } else {
        return cb(null);
      }
    });
  },

  addForkedBlock: function(params, cb) {
    var newForkedBlock = new ForkedBlock(params);
    newForkedBlock.save(function(err) {
      if (err) {
        console.log(err)
        return cb(err)
      } else {
        return cb(null);
      }
    });
  },

  // find block via number or hash
  getBlock: function(query, cb) {
    Block.findOne({$or: [{number:query}, {hash:query}]}, function(err, block){
      if (err) {
        return cb(err, null);
      } else {
        return cb(null, block);
      }
    });
  },

  // store uncle in db
  addUncle: function(params, cb) {
    var newUncle = new Uncle(params);
    newUncle.save(function(err) {
      if (err) {
        return cb(err)
      } else {
        return cb(null);
      }
    });
  },

  // TRANSACTIONS
  // store block in db
  addTransaction: function(params, cb) {
    var newTransaction = new Transaction(params);
    newTransaction.save(function(err) {
      if (err) {
        return cb(err)
      } else {
        return cb(null);
      }
    });
  },

  addTokenTransfer: function(params, cb) {
    var newTokenTransfer = new TokenTransfer(params);
    newTokenTransfer.save(function(err) {
      if (err) {
        return cb(err)
      } else {
        return cb(null);
      }
    });
  },

  getSupply: function(cb) {
    SystemStore.findOne({symbol:'UBQ'}, function(err, store) {
      if (err) {
        return cb(err, null);
      } else {
        return cb(null, store);
      }
    });
  },

  updateStore: function(newSupply, head, price, cb) {
    SystemStore.update({symbol: 'UBQ'}, {
      timestamp: Date.now(),
      supply: newSupply,
      latestBlock: head,
      price: price
    }, function(){
      return cb();
    });
  }
};
