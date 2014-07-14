# oembetter

`oembetter` is an [oembed](http://oembed.com) client which allows you to add filters that provide or improve oembed support for services that either don't have it or don't do it very well.

`oembetter` allows you to easily add your own filters and also supply a whitelist of services you trust to prevent XSS attacks.

`oembetter` intentionally sticks the oembed standard so you can use it to implement straightforward proxies that provide "better oembed."

## Basic Usage

```javascript
var oembetter = require('oembetter')();

oembetter.fetch(url, function(err, response) {
  if (!err) {
    // response.html contains markup to embed the video or
    // whatever it might be
  }
});
```

## Adding Filters

### Filtering before the oembed request

Some services don't support `oembed`. In these cases you'll want to fake it by providing a filter that substitutes its own response.

Other services support `oembed`, but only for certain URLs. In these cases you'll want to change the URL that `oembed` will use.

Pass a function to the `addBefore` method. This function will receive the URL, the response so far (usually undefined at this point), and a callback function. Your function should invoke the callback with an error if any, and a new URL and new response object if desired. You may also modify the response object you are given.

"When would `response` already be defined?" If another `before` filter has already suggested one, you'll see it even though we haven't made a real oembed call yet.

**If any filter provides a response object, then an actual oembed call is not made.** Not all `before` filters do this. Some just change the URL.

**Your filter must begin by making sure this URL is relevant to its interests.**

Example:

```javascript
oembetter.addBefore(function(url, response, callback) {
  if (!url.match(/^https?\:\/\/hootenanny.com/)) {
    return setImmediate(callback);
  }
  var newResponse = {
    thumbnail_url: 'http://hootenanny.com/pretty.jpg',
    html: '<iframe src="http://hootenanny.com/pretty"></iframe>'
  };
  return callback(null, url, newResponse);
});
```

### Filtering after the oembed request

Some services support `oembed`, but not quite well enough. So you want to make a small adjustment to the standard response. You want an `after` filter.

Here's an async filter that makes sure YouTube's embed codes use `wmode=opaque` and also upgrades to a high-res thumbnail if possible. This one is standard, by the way, so you don't really need to add it.

```javascript
oembetter.addAfter(function(url, response, callback) {
  if (!url.match(/youtube/)) {
    return setImmediate(callback);
  }

  // Fix YouTube iframes to use wmode=opaque so they don't
  // ignore z-index in Windows Chrome
  response.html = response.html.replace('feature=oembed', 'feature=oembed&wmode=opaque');

  // Fix thumbnail to be largest available if it exists
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

It's just like a `before` filter, except that there is no `response` argument passed to your callback:

```javascript
oembetter.addFallback(function(url, callback) {
  if (!url.match(/^https?\:\/\/hootenanny.com/)) {
    return setImmediate(callback);
  }
  var response = {
    thumbnail_url: 'http://hootenanny.com/pretty.jpg',
    html: '<iframe src="http://hootenanny.com/pretty"></iframe>'
  };
  return callback(null, response);
});
```
