import 'expo-asset';
import { registerRootComponent } from 'expo';
import { createElement } from 'react';
import { Provider } from 'react-redux';
import './shim';

import App from './src/App';
import plugins from './src/plugins';
import store from './src/store';

// Polyfill
// eslint-disable-next-line no-undef
process.nextTick = setImmediate;

// Installs plugins
plugins.forEach((plugin) => plugin.install(store));

registerRootComponent(() => createElement(Provider, { store }, createElement(App)));
