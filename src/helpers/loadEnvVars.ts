import _ from 'lodash';

export async function loadEnvVars(): Promise<boolean> {
  const ENVS = [
    process.env.REACT_NATIVE_BRIDGE_URL,
    process.env.REACT_NATIVE_CRYPTO_SECRET,
    process.env.REACT_NATIVE_CRYPTO_SECRET2,
    process.env.REACT_NATIVE_DRIVE_API_URL,
    process.env.REACT_NATIVE_MAGIC_IV,
    process.env.REACT_NATIVE_MAGIC_SALT,
    process.env.REACT_NATIVE_PHOTOS_API_URL,
    process.env.REACT_NATIVE_PHOTOS_NETWORK_API_URL,
    process.env.REACT_NATIVE_RECAPTCHA_V3,
    process.env.REACT_NATIVE_SEGMENT_API,
    process.env.REACT_NATIVE_SEGMENT_API_DEV
  ];

  const VALID_ENVS = _.filter(ENVS, _.size);

  if (VALID_ENVS.length !== ENVS.length) {
    throw Error('Check your envs');
  }

  return true;
}
