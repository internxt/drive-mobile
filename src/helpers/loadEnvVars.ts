import _ from 'lodash'

export async function loadEnvVars() {
  const ENVS = [
    process.env.REACT_NATIVE_API_URL,
    process.env.REACT_NATIVE_CRYPTO_SECRET
  ];

  const VALID_ENVS = _.filter(ENVS, _.size)

  if (VALID_ENVS.length !== ENVS.length) {
    throw Error('Check your envs')
  }
  return true
}