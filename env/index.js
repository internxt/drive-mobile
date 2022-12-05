const isRunningOnCI = process.env.CI !== undefined;
const development = !isRunningOnCI ? require('./.env.development.json') : {};
const test = !isRunningOnCI ? require('./.env.test.json') : {};
const production = !isRunningOnCI ? require('./.env.production.json') : {};
const staging = !isRunningOnCI ? require('./.env.staging.json') : {};
module.exports = {
  development,
  test,
  production,
  staging,
};
