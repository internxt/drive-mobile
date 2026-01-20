// Regenerator runtime for async/await in Hermes
import 'regenerator-runtime/runtime';

if (globalThis.__dirname === undefined) globalThis.__dirname = '/';
if (globalThis.__filename === undefined) globalThis.__filename = '';

if (globalThis.process === undefined || globalThis.process.version === undefined) {
  const processPolyfill = require('process/browser');
  globalThis.process = processPolyfill;
}

// Expo 53+ includes a process polyfill, but it's missing some properties we need
process.browser = true;
process.version = process.version || 'v16.0.0';
process.versions = process.versions || { node: '16.0.0' };
process.env = process.env || {};

const isDev = typeof __DEV__ === 'boolean' && __DEV__;
process.env.NODE_ENV = isDev ? 'development' : 'production';

// Expo 53+ update: Ensure process.nextTick is defined
if (process.nextTick === undefined) {
  process.nextTick = setImmediate;
}
