import _ from 'lodash';
import { constants } from '../services/app';

export async function loadEnvVars(): Promise<boolean> {
  const ENVS = [
    constants.REACT_NATIVE_CRYPTO_SECRET,
    constants.REACT_NATIVE_CRYPTO_SECRET2,
    constants.REACT_NATIVE_MAGIC_IV,
    constants.REACT_NATIVE_MAGIC_SALT,
    constants.REACT_NATIVE_DRIVE_API_URL,
    constants.REACT_NATIVE_BRIDGE_URL,
    constants.REACT_NATIVE_PHOTOS_API_URL,
    constants.REACT_NATIVE_PHOTOS_NETWORK_API_URL,
    constants.REACT_NATIVE_RECAPTCHA_V3,
    constants.REACT_NATIVE_SEGMENT_API,
  ];

  const VALID_ENVS = _.filter(ENVS, _.size);

  if (VALID_ENVS.length !== ENVS.length) {
    throw Error('(loadEnvVars) Missing some environment variables!');
  }

  return true;
}
