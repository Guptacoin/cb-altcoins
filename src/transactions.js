var async = require('async')
var utils = require('./utils')

function Transactions(url) {
  this.url = url
}

Transactions.prototype.summary = function(txIds, callback) {
  var uri = this.url + "txs/"

  utils.batchRequest(uri, txIds, {params: ["output=guptawallet"]}, function(err, data) {
    if(err) return callback(err)

    var results = data.map(function(d) {
      return {
        txId: d.txid,
        blockId: d.blockhash,
        blockHeight: 0,
        nInputs: d.vins.length,
        nOutputs: d.vout.length,
        totalInputValue: getTotalValue(d.vins),
        totalOutputValue: getTotalValue(d.vouts)
      }
    })

    callback(null, Array.isArray(txIds) ? results : results[0])
  })

  function getTotalValue(inputs) {
    if (!inputs) return 0

    return inputs.reduce(function(memo, input) {
      if(!input.value) input.value=0;
      return memo + Math.round(input.value * 1e8)
    }, 0)
  }
}

Transactions.prototype.get = function(txIds, callback) {
  var uri = this.url + "rawtxs/"

  var queryTxIds = [].concat(txIds)
  utils.batchRequest(uri, queryTxIds, {params: ["output=guptawallet"]}, function(err, data) {
    if (err) return callback(err)

    var results = data.map(function(d, i) {
      return {
        txId: d.txid,
        txHex: d.hex,
        blockId: d.blockhash,
        blockHeight: 0,

        // non-standard
        __blockTimestamp: d.blocktime,
        __confirmations: d.confirmations || 0
      }
    })

    callback(null, Array.isArray(txIds) ? results : results[0])
  })
}

Transactions.prototype.propagate = function(transactions, callback) {
  var that = this

  if(!Array.isArray(transactions)) {
    transactions = [transactions]
  }

  var requests = transactions.map(function(txHex) {
    return function(cb) {
      utils.makePostRequest(that.url + 'tx/send', { rawtx: txHex }, cb)
    }
  })

  async.parallel(requests, callback)
}

module.exports = Transactions
