import _ from 'lodash';

export async function loadEnvVars(): Promise<boolean> {
  // This envs are mandatory to run the app, others can be skipped
  const ENVS = [
    process.env.REACT_NATIVE_API_URL,
    process.env.REACT_NATIVE_CRYPTO_SECRET,
    process.env.REACT_NATIVE_CRYPTO_SECRET2,
    process.env.REACT_NATIVE_MAGIC_IV,
    process.env.REACT_NATIVE_MAGIC_SALT,
    process.env.REACT_NATIVE_RECAPTCHA_V3
  ];

  const VALID_ENVS = _.filter(ENVS, _.size);

  if (VALID_ENVS.length !== ENVS.length) {
    throw Error('Check your envs');
  }
  return true;
}