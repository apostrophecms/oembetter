var request = require('request');

module.exports = {
  before: [],
  after: [
    require('./lib/fb.js')
  ],
  fallback: []
};
