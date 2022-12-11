const fetch = require('node-fetch');
const urls = require('url');
const xml2js = require('xml2js');
const async = require('async');
const cheerio = require('cheerio');
const util = require('util');

let forceXml = false;

module.exports = oembed;

// The _canonical option is used internally to prevent
// infinite recursion when retrying with a canonical URL.
// Don't worry about it in your code.

async function oembed(url, options, endpoint, callback, _canonical) {

  try {
    let result;
    const { canonical, oUrl } = await discover();
    if (canonical) {
      return oembed(canonical, options, endpoint, callback, true);
    }
    return callback(null, await retrieve());
  } catch (e) {
    return callback(e);
  }

  async function discover() {
    // if we're being told the end point, use it
    if (endpoint)
    {
      if (!options) {
        options = {};
      }

      oUrl = endpoint;
      options.url = url;
      return { oUrl };
    }

    // otherwise discover it
    const body = await get(url, {
      headers: Object.assign({
        'User-Agent': 'oembetter'
      }, options.headers || {})
    });
    const $ = cheerio.load(body);

    // <link rel="alternate" type="application/json+oembed" href="http://www.youtube.com/oembed?format=json&amp;url=http%3A%2F%2Fwww.youtube.com%2Fwatch%3Fv%3Dzsl_auoGuy4" title="An Engineer&#39;s Guide to Cats 2.0 - The Sequel">

    // Allow for all the dumb stuff we've seen.
    // (Only application/json+oembed and
    // text/xmloembed are in the standard.)

    const ideas = [
      'link[type="application/json+oembed"]',
      'link[type="text/json+oembed"]',
      'link[type="application/xml+oembed"]',
      'link[type="text/xml+oembed"]'
    ];

    for (let i = 0; (i < ideas.length); i++) {
      oUrl = $(ideas[i]).attr('href');
      if (oUrl) {
        oUrl = urls.resolve(url, oUrl);
        if (url.match(/^https:/) && oUrl.match(/^http:/)) {
          // Fix for YouTube's bug 12/15/20: issuing HTTP discovery URLs
          // but flunking them with a 403 when they arrive
          if (oUrl.match(/youtube/) && oUrl.match(/^http:/)) {
            oUrl = oUrl.replace(/^http:/, 'https:');
          }
        }
        break;
      }
    }


    if (!oUrl) {
      if (!_canonical) {
        // No oembed information here, however if
        // there is a canonical URL retry with that instead
        const canonical = $('link[rel="canonical"]').attr('href');
        if (canonical && (canonical !== url)) {
          return { canonical };
        }
      }
      throw new Error('no oembed discovery information available');
    }
    return { oUrl };
  }

  async function retrieve() { 
    // Just for testing - a lot of modern services
    // default to JSON and we want to make sure we
    // still test XML too
    if (forceXml) {
      oUrl = oUrl.replace('json', 'xml');
    }
    if (options) {
      // make sure parsed.query is an object by passing true as
      // second argument
      const parsed = urls.parse(oUrl, true);
      const keys = Object.keys(options);
      if (!parsed.query) {
        parsed.query = {};
      }
      keys.forEach(function(key) {
        if (key !== 'headers') {
          parsed.query[key] = options[key];
        }
      });
      // Clean up things url.format defaults to if they are already there,
      // ensuring that parsed.query is actually used
      delete parsed.href;
      delete parsed.search;
      oUrl = urls.format(parsed);
    }
    const body = await get(oUrl, {
      headers: Object.assign({
        'User-Agent': 'oembetter'
      }, options.headers || {})
    });
    if (body[0] === '<') {
      return parseXmlString(body);
    } else {
      return JSON.parse(body);
    }
  }
};

async function get(url, options) {
  const response = await fetch(url, options);
  if (response.status >= 400) {
    throw response;
  }
  return response.text();
}

async function parseXmlString(body) {
  const response = await util.promisify(xml2js.parseString)(body, { explicitArray: false });
  if (!response.oembed) {
    throw new Error('XML response lacks oembed element');
  }
  result = response.oembed;
  result._xml = true;
  return result;
}

// For testing
module.exports.setForceXml = function(flag) {
  forceXml = flag;
};
