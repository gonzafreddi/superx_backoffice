const cssProxy = new Proxy({}, { get: (_target, property) => String(property) });
require.extensions[".css"] = (module) => { module.exports = { __esModule: true, default: cssProxy }; };
