var assert = require("assert");
var oembetter = require('../index.js')();
var urls = require('url');

// For testing custom before filters
oembetter.addBefore(function(url, options, response, callback) {
  var parsed = urls.parse(url);
  if (!oembetter.inDomain('hootenanny.com', parsed.hostname)) {
    return setImmediate(callback);
  }
  var matches = parsed.path.match(/pages\/(\d+).html/);
  if (!matches) {
    return setImmediate(callback);
  }
  var id = matches[1];
  var newResponse = {
    thumbnail_url: 'http://hootenanny.com/thumbnails/' + id + '.jpg',
    html: '<iframe src="http://hootenanny.com/videos/' + id + '"></iframe>'
  };
  return callback(null, url, options, newResponse);
});

// For testing a before filter that just adjusts the URL
oembetter.addBefore(function(url, options, response, callback) {
  var parsed = urls.parse(url);
  if (!oembetter.inDomain('wiggypants.com', parsed.hostname)) {
    return setImmediate(callback);
  }
  url = url.replace(/wiggypants\.com/g, 'jiggypants.com');
  return callback(null, url);
});

// just verifying that wiggypants became jiggypants
oembetter.addBefore(function(url, options, response, callback) {
  var parsed = urls.parse(url);
  if (!oembetter.inDomain('jiggypants.com', parsed.hostname)) {
    return setImmediate(callback);
  }
  return callback(null, url, options, { html: 'so jiggy' });
});

// "after" filter can change a response
oembetter.addAfter(function(url, options, response, callback) {
  var parsed = urls.parse(url);
  if (!oembetter.inDomain('jiggypants.com', parsed.hostname)) {
    return setImmediate(callback);
  }
  response.extra = 'extra';
  return callback(null);
});

// "fallback" filter can create a response when oembed fails
oembetter.addFallback(function(url, options, callback) {
  var parsed = urls.parse(url);
  if (!oembetter.inDomain('wonkypants83742938.com', parsed.hostname)) {
    return setImmediate(callback);
  }
  return callback(null, { html: 'so wonky' });
});

// fallback filter for a working domain has no effect
oembetter.addFallback(function(url, options, callback) {
  var parsed = urls.parse(url);
  if (!oembetter.inDomain('youtube.com', parsed.hostname)) {
    return setImmediate(callback);
  }
  return callback(null, { html: 'oopsie' });
});


describe('oembetter', function() {
  // youtube oembed can be sluggish
  this.timeout(10000);
  it('should be an object', function() {
    assert(oembetter);
  });
  it('should return no response gracefully for boutell.com', function(done) {
    oembetter.fetch('http://boutell.com/', function(err, response) {
      assert(err);
      return done();
    });
  });
  var result;
  it('should return an oembed response for youtube', function(done) {
    oembetter.fetch('https://www.youtube.com/watch?v=zsl_auoGuy4', function(err, response) {
      assert(!err);
      assert(response);
      assert(response.html);
      result = response;
      done();
    });
  });
  it('should return an oembed response for youtube with forced use of XML', function(done) {
    require('../oembed.js').setForceXml(true);
    oembetter.fetch('https://www.youtube.com/watch?v=zsl_auoGuy4', function(err, response) {
      require('../oembed.js').setForceXml(false);
      assert(!err);
      assert(response);
      assert(response.html);
      assert(response._xml);
      result = response;
      done();
    });
  });
  it('should respect a custom before filter', function(done) {
    oembetter.fetch('http://hootenanny.com/pages/50.html', function(err, response) {
      assert(!err);
      assert(response);
      assert(response.html);
      assert(response.html === '<iframe src="http://hootenanny.com/videos/50"></iframe>');
      return done();
    });
  });
  it('inDomain method should handle a subdomain properly', function(done) {
    oembetter.fetch('http://www.hootenanny.com/pages/50.html', function(err, response) {
      assert(!err);
      assert(response);
      assert(response.html);
      assert(response.html === '<iframe src="http://hootenanny.com/videos/50"></iframe>');
      return done();
    });
  });
  it('inDomain method should flunk a bad domain', function(done) {
    oembetter.fetch('http://flhootenanny.com/pages/50.html', function(err, response) {
      assert(err);
      return done();
    });
  });
  it('before filter can adjust URL', function(done) {
    oembetter.fetch('http://wiggypants.com/whatever', function(err, response) {
      assert(!err);
      assert(response);
      assert(response.html === 'so jiggy');
      return done();
    });
  });
  it('after filter can change response', function(done) {
    oembetter.fetch('http://jiggypants.com/whatever', function(err, response) {
      assert(!err);
      assert(response);
      assert(response.extra === 'extra');
      assert(response.html === 'so jiggy');
      return done();
    });
  });
  it('fallback filter can provide last ditch response', function(done) {
    oembetter.fetch('http://wonkypants83742938.com/purple', function(err, response) {
      assert(!err);
      assert(response);
      assert(response.html === 'so wonky');
      return done();
    });
  });
  it('fallback filter for a working oembed service has no effect', function(done) {
    oembetter.fetch('https://www.youtube.com/watch?v=zsl_auoGuy4', function(err, response) {
      assert(!err);
      assert(response);
      assert(response.html !== 'oopsie');
      return done();
    });
  });
  it('setting whitelist does not crash', function() {
    oembetter.whitelist([ 'jiggypants.com' ]);
  });
  it('whitelisted domains work', function(done) {
    oembetter.fetch('http://jiggypants.com/whatever', function(err, response) {
      assert(!err);
      assert(response);
      assert(response.html === 'so jiggy');
      return done();
    });
  });
  it('unwhitelisted domains do not work', function(done) {
    oembetter.fetch('http://wiggypants.com/whatever', function(err, response) {
      assert(err);
      return done();
    });
  });
  it('suggested whitelist is available', function() {
    assert(Array.isArray(oembetter.suggestedWhitelist));
  });
  it('non-http URLs fail up front with the appropriate error', function(done) {
    oembetter.fetch('test://jiggypants.com/whatever', function(err, response) {
      assert(err);
      assert(err.message === 'oembetter: URL is neither http nor https: test://jiggypants.com/whatever');
      return done();
    });
  });
  it('We can set the suggested endpoints and whitelist', function() {
    oembetter.whitelist(oembetter.suggestedWhitelist);
    oembetter.endpoints(oembetter.suggestedEndpoints);
  });
  it('Taylor Swift video comes through as type video', function(done) {
    oembetter.fetch('https://www.facebook.com/TaylorSwift/videos/10153629261480369/', function(err, response) {
      assert(!err);
      assert(response.type === 'video');
      return done();
    });
  });
  it('Zuck photo post comes through as rich', function(done) {
    oembetter.fetch('https://www.facebook.com/photo.php?fbid=10103741991850131&set=a.529237706231.2034669.4&type=3&theater', function(err, response) {
      assert(!err);
      assert(response.type === 'rich');
      return done();
    });
  });
});

