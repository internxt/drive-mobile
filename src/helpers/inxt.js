import { FileSystem } from 'expo';
//const { Environment } = require('node-lib');

import { utils } from './utils';

function getEnvironment(email, password, mnemonic) {
  try {
    return new Environment({
      bridgeUrl: process && process.env && process.env.REACT_APP_BRIDGE_URL,
      bridgeUser: email,
      bridgePass: password,
      encryptionKey: mnemonic,
      logLevel: 4
    });
  } catch (error) {
    console.log('getEnvironment', error);
    return null;
  }
}

function isUserActivated(email) {
  // Set api call settings
  const headers = { 'Content-Type': 'application/json', email };

  // Do api call
  return fetch(
    `${process &&
      process.env &&
      process.env.REACT_APP_BRIDGE_URL}/users/isactivated`,
    {
      method: 'GET',
      headers
    }
  );
}

function resolveFile(user, file) {
  const downloadedFile = `${FileSystem.documentDirectory}/${file.name}.${file.type}`;

  return new Promise((resolve, reject) => {
    const inxt = getEnvironment(user.email, user.userId, user.mnemonic);
    console.log(`Resolving file ${file.name}`);

    // Bridge call
    const state = inxt.resolveFile(file.bucket, file.fileId, downloadedFile, {
      progressCallback: (progress, downloadedBytes, totalBytes) => {
        console.log(`Progress: ${progress}`);
      },
      finishedCallback: err => {
        if (err) {
          reject(err);
        }
        console.log(`Succesfully downloaded file ${downloadedFile}`);
        resolve(state);
        storj.destroy();
      }
    });
  });
}

export const inxt = {
  isUserActivated,
  resolveFile
};
