var request = require('request');

module.exports = {
  before: [],
  after: [
    function(url, response, callback) {
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
    },

    function(url, response, callback) {
      if (!url.match(/vimeo/)) {
        return setImmediate(callback);
      }
      // Fix vimeo thumbnails to be larger
      result.thumbnail_url = result.thumbnail_url.replace('640.jpg', '1000.jpg');
      return callback(null);
    }
  ],
  fallback: []
};
