import 'expo-asset';
import { registerRootComponent } from 'expo';
import { createElement } from 'react';
import { Provider } from 'react-redux';

import App from './src/App';
import plugins from './src/plugins';
import store from './src/store';

// Installs plugins
plugins.forEach((plugin) => plugin.install(store));

registerRootComponent(() => createElement(Provider, { store }, createElement(App)));
