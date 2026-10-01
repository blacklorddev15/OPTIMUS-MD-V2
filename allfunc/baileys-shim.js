/**
 * baileys-shim.js
 * Provides sync-compatible access to baileys v6 ESM exports.
 * pair.js calls init() once after `await import('@whiskeysockets/baileys')`.
 * All other CJS files use this shim instead of requiring baileys directly.
 */
let _cache = null;

module.exports.init = function (b) {
    _cache = b;
};

// proto – proxied so proto.WebMessageInfo etc. work after init()
module.exports.proto = new Proxy({}, {
    get(_, key) {
        return _cache && _cache.proto ? _cache.proto[key] : undefined;
    }
});

module.exports.getContentType = function (msg) {
    if (_cache && _cache.getContentType) return _cache.getContentType(msg);
    if (!msg || typeof msg !== 'object') return null;
    const keys = Object.keys(msg).filter(k => !['messageContextInfo', 'messageSecret'].includes(k));
    return keys[0] || null;
};

module.exports.delay = function (ms) {
    return new Promise(r => setTimeout(r, ms));
};

module.exports.areJidsSameUser = function (a, b) {
    if (_cache && _cache.areJidsSameUser) return _cache.areJidsSameUser(a, b);
    return a && b && a.split('@')[0] === b.split('@')[0];
};

module.exports.generateWAMessage = async function (...args) {
    if (_cache && _cache.generateWAMessage) return _cache.generateWAMessage(...args);
    throw new Error('baileys not yet initialised');
};

module.exports.extractMessageContent = function (msg) {
    if (_cache && _cache.extractMessageContent) return _cache.extractMessageContent(msg);
    return msg;
};

// Used by pair.js when it builds a media message for waUploadToServer. It has to come through
// here: that call site sits outside the block where startpairing() destructures the other baileys
// exports, so a plain destructuring there never reached it.
module.exports.generateWAMessageContent = async function (...args) {
    if (_cache && _cache.generateWAMessageContent) return _cache.generateWAMessageContent(...args);
    throw new Error('baileys not yet initialised');
};

module.exports.jidNormalizedUser = function (j) {
    if (_cache && _cache.jidNormalizedUser) return _cache.jidNormalizedUser(j);
    return j;
};
