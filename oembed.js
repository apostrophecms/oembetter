var request = require('request');
var urls = require('url');
var xml2js = require('xml2js');
var async = require('async');
var cheerio = require('cheerio');

var forceXml = false;

module.exports = oembed;

// The _canonical option is used internally to prevent
// infinite recursion when retrying with a canonical URL.
// Don't worry about it in your code.

function oembed(url, options, endpoint, mainCallback, _canonical) {
  var oUrl;
  var result;
  return async.series({
    discover: function(callback) {
      // if we're being told the end point, use it
      if (endpoint)
      {
        if (!options) {
          options = {};
        }

        oUrl = endpoint;
        options.url = url;
        return callback(null);
      }

      // otherwise discover it
      return request(url, {
          headers: {
            'User-Agent': 'oembetter'
          }
        }, function(err, response, body) {
        if (err) {
          return callback(err);
        }
        var $ = cheerio.load(body);

        // <link rel="alternate" type="application/json+oembed" href="http://www.youtube.com/oembed?format=json&amp;url=http%3A%2F%2Fwww.youtube.com%2Fwatch%3Fv%3Dzsl_auoGuy4" title="An Engineer&#39;s Guide to Cats 2.0 - The Sequel">

        // Allow for all the dumb stuff we've seen.
        // (Only application/json+oembed and
        // text/xmloembed are in the standard.)

        var ideas = [
          'link[type="application/json+oembed"]',
          'link[type="text/json+oembed"]',
          'link[type="application/xml+oembed"]',
          'link[type="text/xml+oembed"]'
        ];

        var i;
        for (i = 0; (i < ideas.length); i++) {
          oUrl = $(ideas[i]).attr('href');
          if (oUrl) {
            oUrl = urls.resolve(response.request.href, oUrl);
            break;
          }
        }


        if (!oUrl) {
          if (!_canonical) {
            // No oembed information here, however if
            // there is a canonical URL retry with that instead
            var canonical = $('link[rel="canonical"]').attr('href');
            if (canonical && (canonical !== url)) {
              return oembed(canonical, options, endpoint, mainCallback, true);
            }
          }
          return callback(new Error('no oembed discovery information available'));
        }
        return callback(null);
      });
    },
    fetch: function(callback) {
      // Just for testing - a lot of modern services
      // default to JSON and we want to make sure we
      // still test XML too
      if (forceXml) {
        oUrl = oUrl.replace('json', 'xml');
      }
      if (options) {
        // make sure parsed.query is an object by passing true as
        // second argument
        var parsed = urls.parse(oUrl, true);
        var keys = Object.keys(options);
        if (!parsed.query) {
          parsed.query = {};
        }
        keys.forEach(function(key) {
          parsed.query[key] = options[key];
        });
        // Clean up things url.format defaults to if they are already there,
        // ensuring that parsed.query is actually used
        delete parsed.href;
        delete parsed.search;
        oUrl = urls.format(parsed);
      }
      return request(oUrl, {
          headers: {
            'User-Agent': 'oembetter'
          }
        }, function(err, response, body) {
        if (err || (response.statusCode >= 400)) {
          return callback(err || response.statusCode);
        }
        if (body[0] === '<') {
          return xml2js.parseString(body, { explicitArray: false }, function(err, _result) {
            if (err) {
              return callback(err);
            }
            if (!_result.oembed) {
              return callback(new Error('XML response lacks oembed element'));
            }
            _result = _result.oembed;
            _result._xml = true;
            result = _result;
            return callback(null);
          });
        } else {
          try {
            result = JSON.parse(body);
            return callback(null);
          } catch (e) {
            return callback(e);
          }
        }
      });
    }
  }, function(err) {
    if (err) {
      return mainCallback(err);
    }
    return mainCallback(null, result);
  });
};

// For testing
module.exports.setForceXml = function(flag) {
  forceXml = flag;
};

