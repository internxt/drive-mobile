import './shim';

// Polyfills
import 'expo-asset';
import 'intl';
import 'intl/locale-data/jsonp/en';
import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';

// React y Expo
import { registerRootComponent } from 'expo';
import { createElement } from 'react';
import { enableScreens } from 'react-native-screens';
import { Provider } from 'react-redux';
import { TailwindProvider } from 'tailwind-rn';

// App imports
import App from './src/App';
import plugins from './src/plugins';
import store from './src/store';
import utilities from './src/styles/tailwind.json';

enableScreens(false);

// Polyfill for btoa and atob
if (globalThis.btoa === undefined) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires, no-undef
  const { encode, decode } = require('base-64');
  globalThis.btoa = encode;
  globalThis.atob = decode;
}

// Installs plugins
plugins.forEach((plugin) => plugin.install(store));

registerRootComponent(() =>
  createElement(Provider, { store }, createElement(TailwindProvider, { utilities }, createElement(App))),
);
