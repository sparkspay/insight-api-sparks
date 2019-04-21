'use strict';

var Common = require('./common');
var sparkscore = require('bitcore-lib-sparks');
var _ = sparkscore.deps._;

function GuardiannodeController(node) {
	this.node = node;
	this.common = new Common({log: this.node.log});
}

GuardiannodeController.prototype.list = function(req, res) {
	var self = this;
	this.getGNList(function(err, result) {
		if (err) {
			return self.common.handleErrors(err, res);
		}
		res.jsonp(result);
	});
};
GuardiannodeController.prototype.listenabled = function(req, res) {
	var self = this;
	this.getGNListEnabled(function(err, result) {
		if (err) {
			return self.common.handleErrors(err, res);
		}
		res.jsonp(result);
	});
};

GuardiannodeController.prototype.listnewstart = function(req, res) {
	var self = this;
	this.getGNListNewStart(function(err, result) {
		if (err) {
			return self.common.handleErrors(err, res);
		}
		res.jsonp(result);
	});
};

GuardiannodeController.prototype.listwatchdog = function(req, res) {
	var self = this;
	this.getGNListWatchDog(function(err, result) {
		if (err) {
			return self.common.handleErrors(err, res);
		}
		res.jsonp(result);
	});
};

GuardiannodeController.prototype.listinfo = function(req, res) {
	var self = this;
	this.getGNListSum(function(err, result) {
		if (err) {
			return self.common.handleErrors(err, res);
		}
		res.jsonp(result);
	});
};



GuardiannodeController.prototype.validate = function (req, res, next) {
    var payeeAddr = req.params.payee;
    //We first validate that the payee address is valid
    var self = this;
    if(!payeeAddr || payeeAddr.length!=34 ) {
        return self.common.handleErrors({
            message: 'Must include a valid format address',
            code: 1
        }, res);
    }

	try {
		var a = new sparkscore.Address(payeeAddr);
	} catch(e) {
		return self.common.handleErrors({
			message: 'Invalid address: ' + e.message,
			code: 1
		}, res);
	}


	//After having valide addr, we get the GNList
	this.getGNList(function(err, gnList){
		if(err){
			return self.common.handleErrors(err, res);
		}

		var filteredMnList = gnList.filter(function(elem){
			return elem.payee === payeeAddr;
		});

		if(!filteredMnList || !filteredMnList[0]){
			return res.jsonp({valid:false, payee:payeeAddr});
		}
		var gn = filteredMnList[0];
		gn.valid = false;

		if(!gn.hasOwnProperty('payee') ||
			gn.hasOwnProperty('vin')){
			var vin = gn.vin.split('-');
			var txid = vin[0];
			var voutindex = vin[1];

			self.node.getDetailedTransaction(txid, function(err, transaction) {
					if (err && err.code === -5) {
							return self.common.handleErrors(null, res);
					} else if(err) {
							return self.common.handleErrors(err, res);
					}
					if(transaction.outputs && transaction.outputs[voutindex]){
						var txvout = transaction.outputs[voutindex]
						if(txvout.satoshis===100000000000 &&
							txvout.spentTxId===undefined &&
							txvout.spentHeight===undefined &&
							txvout.spentIndex===undefined){
								gn.valid = true;
								res.jsonp(gn)
						}else{
								res.jsonp(gn)
						}
					}
			});
		}
	})
};

GuardiannodeController.prototype.getGNListEnabled = function(callback) {
	this.node.services.sparksd.getGNList(function(err, result){
		var GNList = result || [];
		var i = 0;

		for ( i in GNList) {
			if (GNList[i].status  !== "ENABLED" ) {
				delete GNList[i];
			}
		}

		if (err) {
			return callback(err);
		}
		callback(null,GNList);
	});
};

GuardiannodeController.prototype.getGNListNewStart = function(callback) {
	this.node.services.sparksd.getGNList(function(err, result){
		var GNList = result || [];
		var i = 0;

		for ( i in GNList) {
			if (GNList[i].status  !== "NEW_START_REQUIRED" ) {
				delete GNList[i];
			}
		}

		if (err) {
			return callback(err);
		}
		callback(null,GNList);
	});
};

GuardiannodeController.prototype.getGNListWatchDog = function(callback) {
	this.node.services.sparksd.getGNList(function(err, result){
		var GNList = result || [];
		var i = 0;

		for ( i in GNList) {
			if (GNList[i].status  !== "SENTINEL_PING_EXPIRED" ) {
				delete GNList[i];
			}

			if (GNList[i].status !== "WATCHDOG_EXPIRED") {
				delete GNList[i];
			}
		}

		if (err) {
			return callback(err);
		}
		callback(null,GNList);
	});
};



GuardiannodeController.prototype.getGNListSum = function(callback) {
	this.node.services.sparksd.getGNList(function(err, result){
		var GNList = result || [];
		var i = 0;
		var gn_enabled = 0;
		var gn_newstart = 0;
		var gn_watchdog = 0;
		var gn_unknown = 0;

		for ( i in GNList) {
			switch (GNList[i].status) {
				case "ENABLED":
					gn_enabled = ++gn_enabled;
					break;
				case "SENTINEL_PING_EXPIRED":
					gn_watchdog = ++gn_watchdog;
					break;
				case "WATCHDOG_EXPIRED":
					gn_watchdog = ++gn_watchdog;
					break;
				case "NEW_START_REQUIRED":
					gn_newstart = ++gn_newstart;
					break;
				default:
					gn_unknown = ++gn_unknown;
					break;
			}
		}

		var result = {
			enabled: gn_enabled,
			restart: gn_newstart,
			watchdog: gn_watchdog,
			unknown: gn_unknown
		  };

		if (err) {
			return callback(err);
		}
		callback(null,result);
	});
};

GuardiannodeController.prototype.getGNList = function(callback) {
	this.node.services.sparksd.getGNList(function(err, result){
		var GNList = result || [];
		if (err) {
			return callback(err);
		}
		callback(null,GNList);
	});
};

module.exports = GuardiannodeController;
