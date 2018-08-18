'use strict';

var Web3 = require('web3');
var config = require('./lib/config');
var nanotimer = require('nanotimer');
var db = require('./lib/database');
var Crawler = require('./lib/crawler');

var web3 = new Web3(new Web3.providers.HttpProvider('http://' + config.gubiq));

setTimeout(function(){
  db.connect(config.mongodb, function(){
    Crawler.init(web3, function(){
      Crawler.startTimer('10s');
    });
  });
}, 5000);
