var BigNumber = require('bignumber.js');
var request = require('request');

function baseBlockReward(height) {
  if ( height > 2508545 ) {
    return new BigNumber(1000000000000000000);
  } else if ( height > 2150181 ) {
    return new BigNumber(2000000000000000000);
  } else if ( height > 1791818 ) {
    return new BigNumber(3000000000000000000);
  } else if ( height > 1433454 ) {
    return new BigNumber(4000000000000000000);
  } else if ( height > 1075090 ) {
    return new BigNumber(5000000000000000000);
  } else if ( height > 716727 ) {
    return new BigNumber(6000000000000000000);
  } else if ( height > 358363 ) {
    return new BigNumber(7000000000000000000);
  } else if ( height > 0 ) {
    return new BigNumber(8000000000000000000);
  } else {
    // genesis
    return new BigNumber(0);
  }
};

module.exports = {
  // synchonous loop
  syncLoop: function(iterations, process, exit){
    var index = 0,
      done = false,
      shouldExit = false;
    var loop = {
      next:function(){
        if(done){
          if(shouldExit && exit){
            exit(); // Exit if we're done
          } else {
            return; // Stop the loop if we're done
          }
        } else {
          // If we're not finished
          if(index < iterations){
            index++; // Increment our index
            process(loop);
          } else {
            done = true; // Make sure we say we're done
            if(exit) exit(); // Call the callback on exit
          }
        }
      },
      iteration:function(){
        return index - 1; // Return the loop number we're on
      },
      break:function(end){
        done = true; // End the loop
        shouldExit = end; // Passing end as true means we still call the exit callback
      },
      redo:function(){
        process(loop);
      }
    };
    loop.next();
    return loop;
  },

  calculateBlockReward(block, web3, cb) {
    var baseReward = baseBlockReward(block.number);
    var uncles = new BigNumber(baseReward.dividedBy(32).times(block.uncles.length));
    return cb({
      base: baseReward,
      uncles: uncles,
      minted: baseReward.plus(uncles)
    });
  },

  calculateUncleReward(blockNumber, uncleNumber, cb) {
    var baseReward = baseBlockReward(blockNumber);
    var uncleReward = new BigNumber((((uncleNumber + 2) - blockNumber) * baseReward) / 2);
    if (uncleReward < 0) {
      return cb(new BigNumber(0));
    } else {
      return cb(uncleReward);
    }
  },

  isHexPrefixed(str) {
    if (typeof str !== 'string') {
      return false;
    }
    return str.slice(0, 2) === '0x';
  },

  stripHexPrefix(str) {
    if (typeof str !== 'string') {
      return str;
    }
    return module.exports.isHexPrefixed(str) ? str.slice(2) : str;
  },

  addHexPrefix(str) {
    if (typeof str !== 'string') {
      return str;
    }
    return module.exports.isHexPrefixed(str) ? str : '0x' + str;
  },

  splitTransactionInput(str) {
    if (typeof str !== 'string') {
      return str;
    }
    return {
      method: str.substr(0,10).toLowerCase(),
      params: str.substr(10).match(/.{1,64}/g)
    }
  },

  inputParamToAddress(str) {
    if (typeof str !== 'string') {
      return str;
    }
    return module.exports.addHexPrefix(str.substr(24)).toLowerCase();
  },

  inputParamToBigNumber(str) {
    if (typeof str !== 'string') {
      return str;
    }
    return new BigNumber(module.exports.addHexPrefix(str), 16);
  },

  processTransactionInput: function(transaction, cb) {
    var transactionInput = module.exports.splitTransactionInput(transaction.input);

    switch (transactionInput.method) {
      case '0xa9059cbb': // transfer
        return cb({
          isTokenTxn: true,
          from: transaction.from,
          to: module.exports.inputParamToAddress(transactionInput.params[0]),
          value: module.exports.inputParamToBigNumber(transactionInput.params[1]).toString(),
          contract: transaction.to,
          method: 'transfer'
        });
        break;
      case '0x23b872dd': // transferFrom
        return cb({
          isTokenTxn: true,
          from: module.exports.inputParamToAddress(transactionInput.params[0]),
          to: module.exports.inputParamToAddress(transactionInput.params[1]),
          value:  module.exports.inputParamToBigNumber(transactionInput.params[2]).toString(),
          contract: transaction.to,
          method: 'transferFrom'
        });
        break;
      case '0x6ea056a9': // sweep
        return cb({
          isTokenTxn: true,
          from: transaction.to,
          to: transaction.from,
          value: module.exports.inputParamToBigNumber(transactionInput.params[1]).toString(),
          contract: module.exports.inputParamToAddress(transactionInput.params[0]),
          method: 'sweep'
        });
        break;
      case '0x40c10f19': // mint
        return cb({
          isTokenTxn: true,
          from: '0x0000000000000000000000000000000000000000',
          to: module.exports.inputParamToAddress(transactionInput.params[0]),
          value: module.exports.inputParamToBigNumber(transactionInput.params[1]).toString(),
          contract: transaction.to,
          method: 'mint'
        });
        break;
      default:
        return cb({
          isTokenTxn: false,
        });
        break;
    }
  },
  getPriceBTC: function (cb) {
    request({
      uri:'https://bittrex.com/api/v1.1/public/getmarketsummary?market=BTC-UBQ',
      json: true
    }, function(btcerr, response, summary){
      if (summary.success) {
        return cb((summary['result'][0]['Last']).toFixed(8));
      } else {
        return cb(false);
      }
    });
  }
};
