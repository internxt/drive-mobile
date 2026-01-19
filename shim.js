// Regenerator runtime for async/await in Hermes
import 'regenerator-runtime/runtime';

if (typeof __dirname === 'undefined') global.__dirname = '/';
if (typeof __filename === 'undefined') global.__filename = '';

if (typeof process === 'undefined' || typeof process.version === 'undefined') {
  const processPolyfill = require('process/browser');
  global.process = processPolyfill;
}

// Expo 53+ includes a process polyfill, but it's missing some properties we need
process.browser = true;
process.version = process.version || 'v16.0.0';
process.versions = process.versions || { node: '16.0.0' };
process.env = process.env || {};

const isDev = typeof __DEV__ === 'boolean' && __DEV__;
process.env.NODE_ENV = isDev ? 'development' : 'production';

// Expo 53+ update: Ensure process.nextTick is defined
if (typeof process.nextTick === 'undefined') {
  process.nextTick = setImmediate;
}
