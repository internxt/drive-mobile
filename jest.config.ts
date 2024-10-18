import type { Config } from '@jest/types';
// By default, all files inside `node_modules` are not transformed. But some 3rd party
// modules are published as untranspiled, Jest will not understand the code in these modules.
// To overcome this, exclude these modules in the ignore pattern.
const untranspiledModulePatterns = [
  '@react-native',
  '(jest-)?react-native',
  '@react-native-community',
  'expo(nent)?',
  '@expo(nent)?/.*',
  'react-navigation',
  '@react-navigation/.*',
  '@unimodules/.*',
  'unimodules',
  'native-base',
  'react-native-svg',
  'rn-fetch-blob',
  '@internxt/rn-crypto',
  '@rudderstack',
  'realm',
];

const config: Config.InitialOptions = {
  preset: 'jest-expo',
  verbose: true,
  testRegex: ['\\.spec\\.ts$', '\\.spec\\.tsx$'],
  setupFilesAfterEnv: ['@testing-library/jest-native/extend-expect'],
  transformIgnorePatterns: [`node_modules/(?!${untranspiledModulePatterns.join('|')})`],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  moduleNameMapper: {
    '^uuid$': require.resolve('uuid'),
  },
};

export default config;
