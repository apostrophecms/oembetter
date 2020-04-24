# oembetter

<a href="https://apostrophecms.org/"><img src="https://raw.github.com/punkave/oembetter/master/logos/logo-box-madefor.png" align="right" /></a>

`oembetter` is a modern [oembed](http://oembed.com) client which allows you to add filters that provide or improve oembed support for services that either don't have it or don't do it very well.

`oembetter` fully supports the `oembed` standard including both XML and JSON responses from servers, and delivers the result as a neatly parsed JavaScript object.

`oembetter` also allows you to whitelist trusted `oembed` domains. We strongly recommend this to prevent session cookie theft and other attacks.

`oembetter` intentionally sticks to the oembed standard so you can use it to implement straightforward proxies that provide "better oembed."

## Basic Usage

```javascript
var oembetter = require('oembetter')();

oembetter.fetch(url, function(err, response) {
  if (!err) {
    // thumbnail_url points to an image
    console.log(response.thumbnail_url);

    // response.html contains markup to embed the video or
    // whatever it might be
    console.log(response.html);
  }
});
```

oembetter is not restricted to handling responses of type `video`. See the [oembed documentation](http://oembed.com) for other response types that may come down the pipe.

## Usage with `maxwidth` and `maxheight`

You can pass an object containing `maxwidth` and `maxheight` options. Sites vary in how well they support them.

```javascript
var oembetter = require('oembetter')();

oembetter.fetch(url, { maxwidth: 480, maxheight: 480 }, function(err, response) {
  if (!err) {
    // response.html contains markup to embed the video or
    // whatever it might be
  }
});
```


## Important security note: whitelisting

**Trusting `oembed` completely isn't safe for your users,** especially if you are allowing untrusted users to embed things. The HTML returned by third party sites could do nasty things like running JavaScript that sniffs user sessions or just displaying a fake login prompt.

But sites like YouTube, Vimeo and Flickr do play nicely with others. So we use a whitelist to decide which domains are OK:

```javascript
oembetter.whitelist([ 'youtube.com', 'vimeo.com', 'wufoo.com' ]);
```

Just list acceptable domain names and `oembetter` will make sure URLs are in one of those domains (or a subdomain) before doing anything else. If not, an error is delivered to the callback.

For your convenience, there is a standard whitelist available. Use it at your own risk:

```javascript
oembetter.whitelist(oembetter.suggestedWhitelist);
```

## Suggesting Endpoints

Some services support `oembed` but aren't discoverable. You can tell oembetter where to point for the oembed api by passing in an array of endpoints.

```javascript
oembetter.endpoints([
  { domain: 'instagram.com', endpoint: 'http://api.instagram.com/oembed' },
  { domain: 'facebook.com', path: /\/videos\//, endpoint: 'https://www.facebook.com/plugins/video/oembed.json/' },
]);
```

There is also a list of suggested endpoints which you can elect to use:

```javascript
oembetter.endpoints(oembetter.suggestedEndpoints);
```

(Hint: you can concatenate an additional array with your own endpoints if desired.)

## Adding Filters

### Filtering before the oembed request

Some services don't support `oembed`. In these cases you'll want to fake it by providing a filter that substitutes its own response.

Other services support `oembed`, but only for certain URLs. In these cases you'll want to change the URL that `oembed` will use.

Pass a function to the `addBefore` method. This function will receive the URL, the options object (which might contain `maxwidth` and `maxheight`), the response so far (usually undefined at this point), and a callback function. Your function should invoke the callback with an error if any, and a new URL, options object and response object if desired. You may also modify the objects you are given and skip passing any arguments to the callback.

"When would `response` already be defined?" If another `before` filter has already suggested one, you'll see it even though we haven't made a real oembed call yet.

**If any filter provides a response object, then an actual oembed call is not made.** Not all `before` filters do this. Some just change the URL.

**Your filter must begin by making sure this URL is relevant to its interests.**

Here's an example: `hootenanny.com` (yes, I made it up) has pages like `/pages/50.html`. We know each one has a thumbnail at `/thumbnails/50.jpg` and a video page suitable for iframes at `/videos/50`. Let's create our own oembed response since `hootenanny.com` doesn't support it.

```javascript
var urls = require('url');

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
```

You can also write a filter that just adjusts URLs. This filter knows that `wiggypants.com` URLs will work better if we point them at `jiggypants.com`:

```javascript
oembetter.addBefore(function(url, options, response, callback) {
  var parsed = urls.parse(url);
  if (!oembetter.inDomain('wiggypants.com', parsed.hostname)) {
    return setImmediate(callback);
  }
  url = url.replace(/wiggypants\.com/g, 'jiggypants.com');
  return callback(null, url);
});
```

### Filtering after the oembed request

Some services support `oembed`, but not quite well enough. So you want to make a small adjustment to the standard response. You want an `after` filter.

Here's an async filter that makes sure YouTube's embed codes use `wmode=opaque` and also upgrades to a high-res thumbnail if possible.

```javascript
oembetter.addAfter(function(url, options, response, callback) {
  if (!url.match(/youtube/)) {
    return setImmediate(callback);
  }

  // Fix YouTube iframes to use wmode=opaque so they don't
  // ignore z-index in Windows Chrome
  response.html = response.html.replace('feature=oembed', 'feature=oembed&wmode=opaque');

  // Change thumbnail to be largest available if it exists
  var maxResImage = result.thumbnail_url.replace('hqdefault.jpg', 'maxresdefault.jpg');

  return request.head(maxResImage, function(err, httpResponse) {
    if (response.statusCode < 400) {
      result.thumbnail_url = maxResImage;
    }
    return callback(null);
  });
});
```

This filter modifies the `result` object directly. You may also pass a new `result` object as the second argument to the callback.

### Fallback filters: when all else fails

`after` filters are only called if there *is* a response.

If you wish to provide a fallback solution for cases where there is **no** response from oembed, use a fallback filter.

This only makes sense when you're hopeful that oembed will work some of the time. If not, write a `before` filter that supplies its own response.

```javascript
// "fallback" filter can create a response when oembed fails
oembetter.addFallback(function(url, options, callback) {
  var parsed = urls.parse(url);
  if (!oembetter.inDomain('wonkypants83742938.com', parsed.hostname)) {
    return setImmediate(callback);
  }
  return callback(null, { html: 'so wonky' });
});
```

## Changelog

0.1.22: fixed URL parsing bugs impacting use of preconfigured endpoints that already contain some query string parameters.

0.1.21: Updated links and information in the README.

0.1.20: fixed a nuisance error that was appearing when Facebook was present but `window` was not the default object.

0.1.19: unnecessary Facebook API logic was running on non-Facebook embeds due to a syntax mistake in 0.1.17.

0.1.18: report HTTP errors properly rather than attempting to parse a nonexistent JSON body. Also, always try/catch when parsing JSON and report the exception as the callback error if necessary.

0.1.17: Facebook oembed filter works regardless of whether Facebook's API has been initialized yet or not.

0.1.16: Built in filter that handles Facebook oembed responses.

0.1.15: whitelisted `facebook.com`, which has extensive oembed these days.

0.1.14: bumped `cheerio` dependency to fix deprecation warnings. No behavior changes.

0.1.13: relative URLs work with discovery. Thanks to Alejandro Torrado.

0.1.12: (unchanged, npm publishing issue)

0.1.11: don't crash when evaluating whitelists if `parsed.hostname` somehow manages not to be set.

0.1.10: user agent string to please Facebook. Thanks to `equinox7`.

0.1.9: the new `endpoints` option allows you to configure custom oembed API endpoints for services that don't advertise an endpoint or advertise it incorrectly.

0.1.7-0.1.8: support SoundCloud. Added it to the suggested whitelist and added tolerance for their incorrect JSON content type.

0.1.6: security improvement: reject all URLs that are not `http:` or `https:` completely, right up front. This means you don't have to protect against these obvious hacks in your `before` and `after` handlers.

0.1.5: packaging issues, no changes.

0.1.4: if the URL leads to a page with no oembed metadata, look for a `link rel="canonical"` tag and try that URL instead. Don't pursue this more than one step.

Also, specify a user agent so that certain hosts don't give us watered-down HTML.

0.1.3: added `youtu.be` to the suggested whitelist.

## About P'unk Avenue and ApostropheCMS

`oembetter` was created at [P'unk Avenue](http://punkave.com) for use in many projects built with ApostropheCMS, an open-source content management system built on node.js. `oembetter` isn't mandatory for Apostrophe and vice versa, but they play very well together. If you like `oembetter` you should definitely [check out apostrophecms.org](https://apostrophecms.org/).
