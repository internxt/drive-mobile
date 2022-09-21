import 'expo-asset';
import 'intl';
import 'intl/locale-data/jsonp/en';
import './shim';
import { registerRootComponent } from 'expo';
import { createElement } from 'react';
import { Provider } from 'react-redux';
import { TailwindProvider } from 'tailwind-rn';
import utilities from './src/styles/tailwind.json';

import App from './src/App';
import plugins from './src/plugins';
import store from './src/store';

import 'moment/locale/es';
import 'moment/locale/en-in';
import { decode, encode } from 'base-64';
/**
 * Axios removed support for base64 encoding, so we need to provide
 * a polyfill
 */
// eslint-disable-next-line no-undef
if (!global.btoa) {
  // eslint-disable-next-line no-undef
  global.btoa = encode;
}
// eslint-disable-next-line no-undef
if (!global.atob) {
  // eslint-disable-next-line no-undef
  global.atob = decode;
}

// Polyfill
// eslint-disable-next-line no-undef
process.nextTick = setImmediate;

// Installs plugins
plugins.forEach((plugin) => plugin.install(store));

registerRootComponent(() =>
  createElement(Provider, { store }, createElement(TailwindProvider, { utilities }, createElement(App))),
);
