const dotenv = require('dotenv');
const fs = require('fs');

// Load env variables

const REQUIRED_VARIABLES = [
  'REACT_NATIVE_APP_BUILD_NUMBER',
  'REACT_NATIVE_DEBUG',
  'REACT_NATIVE_SHOW_BILLING',
  'REACT_NATIVE_WEB_CLIENT_URL',
  'REACT_NATIVE_DRIVE_API_URL',
  'REACT_NATIVE_BRIDGE_URL',
  'REACT_NATIVE_PHOTOS_API_URL',
  'REACT_NATIVE_PAYMENTS_API_URL',
  'REACT_NATIVE_PHOTOS_NETWORK_API_URL',
  'REACT_NATIVE_CRYPTO_SECRET',
  'REACT_NATIVE_CRYPTO_SECRET2',
  'REACT_NATIVE_MAGIC_IV',
  'REACT_NATIVE_MAGIC_SALT',
  'REACT_NATIVE_RECAPTCHA_V3',
  'REACT_NATIVE_SEGMENT_API',
  'SENTRY_DSN',
  'SENTRY_ORGANIZATION',
  'SENTRY_PROJECT',
  'SENTRY_URL',
  'SENTRY_AUTH_TOKEN',
];

const getEnv = (stage) => {
  const exists = fs.existsSync(`${process.cwd()}/.env.${stage}`);

  if (!exists) {
    throw new Error(`${stage} env file does not exists`);
  }
  dotenv.config({ path: `${process.cwd()}/.env.${stage}` });
  const filteredVariables = {};
  const missing = REQUIRED_VARIABLES.filter((env) => {
    const isMissing = !Object.keys(process.env).includes(env);
    if (!isMissing) {
      filteredVariables[env] = process.env[env];
    }
    return isMissing;
  });
  if (missing.length) {
    throw new Error(`${missing.join(',')} env variables are missing`);
  }

  return filteredVariables;
};
module.exports = {
  default: getEnv,
};
