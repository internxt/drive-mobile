const fs = require('fs/promises');
const path = require('path');

/**
 * This script allows us to generate env files usually for CI
 * environment so the requires doesn't fail
 *
 * A ENV file can be retrieved from a CI env variable in an stringified
 * JSON format
 */

const ENVS = {
  development: process.env.DEV_ENV_FILE ? JSON.parse(process.env.DEV_ENV_FILE) : {},
  production: process.env.PROD_ENV_FILE ? JSON.parse(process.env.PROD_ENV_FILE) : {},
  staging: process.env.STAGING_ENV_FILE ? JSON.parse(process.env.STAGING_ENV_FILE) : {},
  test: process.env.TEST_ENV_FILE ? JSON.parse(process.env.TEST_ENV_FILE) : {},
};
const prepareEnvFiles = async () => {
  await Promise.all(
    Object.keys(ENVS).map(async (envKey) => {
      const filePath = path.join(process.cwd(), 'env', `.env.${envKey}.json`);
      await fs.writeFile(filePath, JSON.stringify(ENVS[envKey], null, 2), 'utf-8');
      console.log(`✅ Generated ${filePath} correctly`);
    }),
  );
};

(async () => await prepareEnvFiles())();
