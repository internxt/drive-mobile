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
  'react-native-blob-util',
  '@internxt/rn-crypto',
  '@internxt/lib',
  'internxt-crypto',
  '@scure/bip39',
  '@scure/base',
  '@noble/hashes',
  '@noble/curves',
  '@noble/ciphers',
  '@noble/post-quantum',
  'uuid',
  'p-limit',
  'yocto-queue',
  'mime',
  'sanitize-html',
  'htmlparser2',
  'domhandler',
  'domutils',
  'dom-serializer',
  'domelementtype',
  'entities',
];

const config: Config.InitialOptions = {
  preset: 'jest-expo',
  verbose: true,
  testRegex: ['\\.spec\\.ts$', '\\.spec\\.tsx$'],
  setupFiles: ['./jest.setup.ts'],
  setupFilesAfterEnv: ['@testing-library/jest-native/extend-expect'],
  transform: {
    '\\.mjs$': 'babel-jest',
  },
  transformIgnorePatterns: [`node_modules/(?!${untranspiledModulePatterns.join('|')})`],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  moduleNameMapper: {
    '@internxt/rn-crypto': '<rootDir>/__mocks__/@internxt/rn-crypto.ts',
    '.*/modules/network-cache.*': '<rootDir>/__mocks__/network-cache.ts',
    'expo-sqlite': '<rootDir>/__mocks__/expo-sqlite.ts',
  },
};

export default config;
