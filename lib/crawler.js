'use strict';

var nanotimer = require('nanotimer');
var fs = require('fs');
var BigNumber = require('bignumber.js');

var lib = require('./common');
var db = require('./database');

var blockTimer = new nanotimer();

var web3;

var head = {hash: ''};
var tail = 0;
var isSyncing = false;

var counter = {
  blocks: 0,
  txns: 0,
  uncles: 0,
  tokentxns: 0
};

var supply;

function addTransactions(transactions, blockTimestamp, cb) {
  let avgGasPrice = new BigNumber(0);
  let txFees = new BigNumber(0);
  lib.syncLoop(transactions.length, function(loop){
    var i = loop.iteration();
    web3.eth.getTransactionReceipt(transactions[i].hash, function(err, receipt) {
      db.addTransaction({
        blockHash: transactions[i].blockHash,
        blockNumber: transactions[i].blockNumber,
        hash: transactions[i].hash,
        timestamp: blockTimestamp,
        input: transactions[i].input,
        value: transactions[i].value,
        gas: transactions[i].gas,
        gasPrice: transactions[i].gasPrice,
        nonce: transactions[i].nonce,
        transactionIndex: transactions[i].transactionIndex,
        from: transactions[i].from,
        to: transactions[i].to,
        gasUsed: receipt.gasUsed,
        contractAddress: receipt.contractAddress,
        logs: receipt.logs
      }, function(err) {
        avgGasPrice = avgGasPrice.plus(transactions[i].gasPrice);
        txFees = txFees.plus(new BigNumber(receipt.gasUsed).times(transactions[i].gasPrice));
        counter.txns += 1;
        loop.next();
      });
    });
  }, function() {
    avgGasPrice = avgGasPrice.div(transactions.length);
    return cb(avgGasPrice, txFees);
  });
}

function addTokenTransfers(block, cb) {
  lib.syncLoop(block.transactions.length, function(loop){
    var i = loop.iteration();
    lib.processTransactionInput(block.transactions[i], function(transfer) {
      if (transfer.isTokenTxn === true) {
        db.addTokenTransfer({
          blockNumber: block.number,
          hash: block.transactions[i].hash,
          timestamp: block.timestamp,
          from: transfer.from,
          to: transfer.to,
          value: transfer.value,
          contract: transfer.contract,
          method: transfer.method
        }, function(err) {
          loop.next();
        });
      } else {
        counter.tokentxns += 1;
        loop.next();
      }
    });
  }, function() {
    return cb();
  });
}

function addUncles(block, cb) {
  if (block.uncles.length > 0 ) {
    var uncleRewards = new BigNumber(0);
    lib.syncLoop(block.uncles.length, function(loop){
      var i = loop.iteration();
      web3.eth.getUncle(block.number, i, function(err, uncle) {
        lib.calculateUncleReward(block.number, uncle.number, function(uncleReward) {
          uncleRewards = uncleRewards.plus(uncleReward)
          supply = supply.plus(uncleReward);
          db.addUncle({
            blockNumber: block.number,
            difficulty: uncle.difficulty,
            gasLimit: uncle.gasLimit,
            gasUsed: uncle.gasUsed,
            hash: uncle.hash,
            miner: uncle.miner,
            number: uncle.number,
            parentHash: uncle.parentHash,
            timestamp: uncle.timestamp,
            sha3Uncles: uncle.sha3Uncles,
            reward: uncleReward
          }, function(uncle_err){
            counter.uncles += 1;
            loop.next();
          });
        });
      });
    }, function(){
      return cb(uncleRewards);
    });
  } else {
    return cb(new BigNumber(0));
  }
}

function checkBlock() {
  if (!web3.isConnected()) {
    console.log('web3 not connected');
    return;
  } else {
    var latestBlock = web3.eth.getBlock('latest');
    if (latestBlock.hash != head.hash && !isSyncing) {
      module.exports.clearTimer();
      module.exports.sync(latestBlock, latestBlock.number+1, function(){
        module.exports.startTimer('10s');
        return;
      });
    } else {
      return;
    }
  }
}

module.exports = {
  init: function(web3Provider, cb) {
    db.getSupply(function(err, systemStore) {
      supply = new BigNumber(systemStore.supply);
      web3 = web3Provider;
      return cb();
    });
  },
  startTimer: function(interval) {
    blockTimer.setInterval(checkBlock,'', interval);
    return;
  },
  clearTimer: function() {
    blockTimer.clearInterval();
    return;
  },
  isSyncing: function() {
    return isSyncing;
  },
  sync: function (latestBlock, iterations, cb) {
    isSyncing = true;
    var startTime = Date.now();
    lib.syncLoop(iterations, function(loop){
      var i = loop.iteration();
      var x = latestBlock.number - i;
      web3.eth.getBlock(x, true, function(err, block){
        addTransactions(block.transactions, block.timestamp, function(avgGasPrice, txFees) {
          addTokenTransfers(block, function() {
            addUncles(block, function (uncleRewards) {
              lib.calculateBlockReward(block, web3, function(reward) {
                supply = supply.plus(reward.minted);
                db.addBlock({
                  difficulty: block.difficulty,
                  gasLimit: block.gasLimit,
                  gasUsed: block.gasUsed,
                  hash: block.hash,
                  miner: block.miner,
                  number: block.number,
                  parentHash: block.parentHash,
                  sha3Uncles: block.sha3Uncles,
                  timestamp: block.timestamp,
                  totalDifficulty: block.totalDifficulty,
                  size: block.size,
                  nonce: block.nonce,
                  blockReward: reward.minted,
                  unclesReward: uncleRewards,
                  extraData: block.extraData,
                  transactions: block.transactions.length,
                  uncles: block.uncles.length,
                  avgGasPrice: avgGasPrice,
                  txFees: txFees
                }, function (block_err) {
                  if (block_err) {
                    // block already exists
                    db.getBlock(block.number, function (err, dbblock) {
                      if (dbblock.hash === block.hash) {
                        //we are at original head of db chain, all is well we can stop.
                        loop.break(true);
                        loop.next();
                      } else {
                        //a different block already exists for this number, a reorg has taken place. REPAIR
                        console.log('reorg detected at block #' + block.number);
                        supply = supply.minus(new BigNumber(dbblock.blockReward).plus(dbblock.unclesReward));
                        db.addForkedBlock({
                          difficulty: dbblock.difficulty,
                          gasLimit: dbblock.gasLimit,
                          gasUsed: dbblock.gasUsed,
                          hash: dbblock.hash,
                          miner: dbblock.miner,
                          number: dbblock.number,
                          parentHash: dbblock.parentHash,
                          sha3Uncles: dbblock.sha3Uncles,
                          timestamp: dbblock.timestamp,
                          totalDifficulty: dbblock.totalDifficulty,
                          size: dbblock.size,
                          nonce: dbblock.nonce,
                          blockReward: dbblock.blockReward,
                          unclesReward: dbblock.unclesReward,
                          extraData: dbblock.extraData,
                          transactions: dbblock.transactions,
                          uncles: dbblock.uncles,
                          avgGasPrice: dbblock.avgGasPrice,
                          txFees: dbblock.txFees
                        }, function(_err) {
                          db.reorgPurge(block.number, function() {
                            loop.redo();
                          });
                        });
                      }
                    });
                  } else {
                    tail = block.number;
                    if (counter.blocks == 1000) { //clear stack
                      console.log('imported %s blocks, %s txns, %s tokentxns, %s uncles - #' + block.number + ' - '+((Date.now() - startTime)/1000).toFixed(3) + 's', counter.blocks, counter.txns, counter.tokentxns, counter.uncles);
                      setTimeout(function() {
                        counter.blocks = 0;
                        counter.txns = 0;
                        counter.tokentxns = 0;
                        counter.uncles = 0;
                        startTime = Date.now();
                        loop.next(); // Run our process, pass in the loop
                      },1);
                    } else {
                      counter.blocks += 1;
                      loop.next();
                    }
                  }
                });
              });
            });
          });
        });
      });
    }, function(){
      head = latestBlock;
      isSyncing = false;
      if (counter.blocks > 0) {
        console.log('imported %s blocks, %s txns, %s tokentxns, %s uncles - #' + tail + ' - '+((Date.now() - startTime)/1000).toFixed(3) + 's', counter.blocks, counter.txns, counter.tokentxns, counter.uncles);
        counter.blocks = 0;
        counter.txns = 0;
        counter.tokentxns = 0;
        counter.uncles = 0;
        lib.getPriceBTC(function (price) {
          console.log('price in btc: %s', price);
          db.updateStore(supply, head, price, function(){
            return cb();
          });
        })
      } else {
        return cb();
      }
    });
  }
}

//
