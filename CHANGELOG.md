# Changelog

## 1.0.1 - 2020-06-30

### Fixes

- Updates `cheerio` to the 1.0.0-rc version series to address a security vulnerability.

## 1.0.0
renamed the `whitelist` and `suggestedWhitelist` properties to `allowlist` and `suggestedAllowlist`, respectively. Also introduced support for `options.headers`.

## 0.1.23
workaround for YouTube bug in which video pages contain `http:` recommendations for oembed URLs, but an `http:` request is rejected with a 403 error. Force `https:` for YouTube.

## 0.1.22
fixed URL parsing bugs impacting use of preconfigured endpoints that already contain some query string parameters.

## 0.1.21
Updated links and information in the README.

## 0.1.20
fixed a nuisance error that was appearing when Facebook was present but `window` was not the default object.

## 0.1.19
unnecessary Facebook API logic was running on non-Facebook embeds due to a syntax mistake in 0.1.17.

## 0.1.18
report HTTP errors properly rather than attempting to parse a nonexistent JSON body. Also, always try/catch when parsing JSON and report the exception as the callback error if necessary.

## 0.1.17
Facebook oembed filter works regardless of whether Facebook's API has been initialized yet or not.

## 0.1.16
Built in filter that handles Facebook oembed responses.

## 0.1.15
allowlisted `facebook.com`, which has extensive oembed these days.

## 0.1.14
bumped `cheerio` dependency to fix deprecation warnings. No behavior changes.

## 0.1.13
relative URLs work with discovery. Thanks to Alejandro Torrado.

## 0.1.12
(unchanged, npm publishing issue)

## 0.1.11
don't crash when evaluating allowlists if `parsed.hostname` somehow manages not to be set.

## 0.1.10
user agent string to please Facebook. Thanks to `equinox7`.

## 0.1.9
the new `endpoints` option allows you to configure custom oembed API endpoints for services that don't advertise an endpoint or advertise it incorrectly.

## 0.1.7-0.1.8
support SoundCloud. Added it to the suggested allowlist and added tolerance for their incorrect JSON content type.

## 0.1.6
security improvement:
reject all URLs that are not `http:` or `https:` completely, right up front. This means you don't have to protect against these obvious hacks in your `before` and `after` handlers.

## 0.1.5
packaging issues, no changes.

## 0.1.4
if the URL leads to a page with no oembed metadata, look for a `link rel="canonical"` tag and try that URL instead. Don't pursue this more than one step.

Also, specify a user agent so that certain hosts don't give us watered-down HTML.

## 0.1.3
added `youtu.be` to the suggested allowlist.