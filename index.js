var oembed = require('oembed');
var filters = require('./filters.js');

module.exports = function(options) {
  var self = {};

  if (!options) {
    options = {};
  }

  self.before = filters.before.concat(options.before || []);
  self.after = filters.after.concat(options.after || []);
  self.fallback = filters.fallback.concat(options.fallback || []);

  self.fetch = function(url, callback) {
    var response;
    var warnings = [];
    return async.series({
      before: function(callback) {
        return async.series(self.before, function(before, callback) {
          return before(url, response, function(err, _url, _response) {
            // Nonfatal
            if (err) {
              warnings.push(err);
              return callback(null);
            }
            url = _url || url;
            response = _response || response;
            return callback(null);
          });
        }, callback);
      },
      fetch: function(callback) {
        if (response) {
          // Preempted by a before
          return callback(null);
        }
        return oembed.fetch(url, function (err, result) {
          if (err) {
            return callback(err);
          } else {
            response = result;
            return callback(null);
          }
        });
      },
      fallback: function(fallbackCallback) {
        if (response) {
          return setImmediate(fallbackCallback);
        }
        return async.series(self.fallback, function(fallback, callback) {
          return fallback(url, function(err, _response) {
            if (err) {
              warnings.push(err);
              return callback(err);
            }
            response = _response || response;
            if (response) {
              // Stop trying fallbacks, we got one
              return fallbackCallback(null);
            }
            return callback(null);
          });
        }, fallbackCallback);
      },
      after: function(callback) {
        if (!response) {
          return setImmediate(callback);
        }
        return async.series(self.after, function(after, callback) {
          return after(url, response, function(err, _response) {
            if (err) {
              warnings.push(err);
              return callback(err);
            }
            response = _response || response;
            return callback(null);
          });
        }, callback);
      }
    }, function(err) {
      if (err) {
        return callback(err);
      }
      return callback(null, response, warnings);
    });
  };

  self.addBefore = function(fn) {
    self.before.push(fn);
  };

  self.addAfter = function(fn) {
    self.after.push(fn);
  };

  self.addFallback = function(fn) {
    self.fallback.push(fn);
  };
};

