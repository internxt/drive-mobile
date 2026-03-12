import { createElement } from 'react';
import { AppRegistry } from 'react-native';
import { TailwindProvider } from 'tailwind-rn';
import ShareExtensionView from './src/shareExtension/ShareExtensionView.ios';
import utilities from './src/styles/tailwind.json';

AppRegistry.registerComponent(
  'shareExtension',
  () => (props) => createElement(TailwindProvider, { utilities }, createElement(ShareExtensionView, props)),
);
