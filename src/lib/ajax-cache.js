const kvidb = require('kv-idb');
const cache = kvidb('store-solcjs');

module.exports = ajaxcache;
ajaxcache.clear = () => cache.clear();

const waiting = {};

function ajaxcache(opts, done) {
  if (opts) var url = typeof opts === 'string' ? opts : opts.url;
  if (!url) done(new Error('`url` or `{ url }` must be a string'));
  const { transform, caching } = opts;
  
  if (window.localStorage[url]) {
    fetch(url, { method: 'HEAD' }).then(response => {
      if (!response.ok) done(response);
      const timestamp = response.headers.get('last-modified');
      cacheFetch({ cache, url, caching, transform, timestamp }, done);
    }).catch(e => {
      console.error('[error]', e);
      timestamp = undefined;
      cacheFetch({ cache, url, caching: true, transform, timestamp }, done);
    });
  } else if (waiting[url]) {
    waiting[url].push(done);
  } else {
    cacheFetch({ cache, url, caching, transform, timestamp: null }, done);
  }
}

function cacheFetch ({ cache, url, caching, transform, timestamp }, done) {
  const isLatest = caching && localStorage[url] === timestamp;
  if (isLatest) return cache.get(url, done);
  waiting[url] = [done];
  fetch(url).then(response => response.text()).then(json => {
    const data = transform ? transform(json) : json;
    cache.put(url, data, error => {
      const listener = waiting[url];
      waiting[url] = undefined;
      if (error) return listener.forEach(fn => fn(error));
      if (caching) localStorage[url] = timestamp;
      listener.forEach(fn => fn(null, data));
    });
  }).catch(e => console.error('[error]', e));
}