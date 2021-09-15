module.exports = {
  env: {
    'react-native/react-native': true
  },
  extends: [
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended'
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaFeatures: {
      jsx: true
    },
    ecmaVersion: 12,
    sourceType: 'module'
  },
  plugins: [
    'react',
    'react-native',
    'ext',
    'unused-imports'
  ],
  rules: {
    '@typescript-eslint/no-use-before-define': 'off',
    '@typescript-eslint/no-unused-vars': 'off',
    'no-console': 'error',
    'comma-dangle': ['error', 'never'],
    '@typescript-eslint/no-empty-function': 'off',
    '@typescript-eslint/no-explicit-any': 'warn',
    'camelcase': ['warn', { 'properties': 'always' }],
    'no-multiple-empty-lines': ['error', { 'max': 1, 'maxEOF': 0, 'maxBOF': 0 }],
    'array-bracket-spacing': ['error', 'never'],
    'react-native/no-unused-styles': 'error',
    'react-native/no-inline-styles': 'warn',
    'react-native/no-single-element-style-arrays': 'error',
    'eqeqeq': 'error',
    'comma-spacing': ['error', { 'before': false, 'after': true }],
    'no-trailing-spaces': ['error'],
    'indent': ['error', 2],
    'quotes': ['error', 'single'],
    'object-curly-spacing': ['error', 'always'],
    'newline-after-var': ['error', 'always'],
    'no-multi-spaces': 'error',
    'curly': 'error',
    'ext/lines-between-object-properties': ['error', 'never'],
    'key-spacing': ['error'],
    'keyword-spacing': 'error',
    'space-in-parens': ['error', 'never'],
    'no-warning-comments': ['error', {
      'terms': ['console.log']
    }],
    '@typescript-eslint/type-annotation-spacing': ['error', {
      'before': false,
      'after': true,
      'overrides': {
        'arrow': { 'before': true, 'after': true }
      }
    }],
    'unused-imports/no-unused-imports': 'error',
    'space-before-function-paren': ['error', {
      'anonymous': 'always',
      'named': 'never',
      'asyncArrow': 'always'
    }]
  },
  'settings': {
    'react': {
      'version': 'detect'
    }
  }
};
