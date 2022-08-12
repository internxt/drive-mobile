const getEnv = require('./env').default;
const { existsSync, writeFileSync } = require('fs');
const configs = require('./config.json');
const destination = process.cwd() + '/eas.json';

if (existsSync(destination)) {
  console.error('\nERROR: An eas.json file was found, if you want to create a new one, manually delete the old one\n');
  process.exit(1);
}

const getTemplate = (environment) => {
  return {
    cli: {
      version: '>= 0.59.0',
    },
    build: {
      [environment]: {
        ...configs[environment],
        env: envs,
      },
    },
    submit: {
      production: {},
    },
  };
};
const envs = getEnv(process.env.NODE_ENV);

// We generate an eas.json file content
const generatedEAS = getTemplate(process.env.NODE_ENV);

writeFileSync(destination, JSON.stringify(generatedEAS, null, 2), 'utf-8');

console.log(`\n\n\n✨ EAS file generated correctly using ${process.env.NODE_ENV} configuration\n\n\n`);
