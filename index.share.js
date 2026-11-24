import './global.css';

// Polyfills
import { Buffer } from 'buffer';
import 'react-native-get-random-values';
if (globalThis.Buffer === undefined) globalThis.Buffer = Buffer;

import { createElement } from 'react';
import { AppRegistry } from 'react-native';
import ShareExtensionView from './src/shareExtension/ShareExtensionView.ios';

AppRegistry.registerComponent('shareExtension', () => (props) => createElement(ShareExtensionView, props));
