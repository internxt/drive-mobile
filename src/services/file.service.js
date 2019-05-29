import { deviceStorage, inxt } from "../helpers";
import { sortTypes } from "../constants";
const { REACT_APP_API_URL } = process.env;

export const fileService = {
  downloadFile,
  getFolderContent,
  createFolder,
  updateFolderMetadata,
  getSortFunction
};

async function setHeaders() {
  const token = await deviceStorage.getItem('xToken');
  const user = JSON.parse(await deviceStorage.getItem('xUser'));
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-type": "application/json; charset=utf-8",
    "internxt-mnemonic": user.mnemonic
  }
  return headers;
}

function downloadFile(user, file) {
  return new Promise((resolve, reject) => {
    inxt.resolveFile(user, file).then((result) => {
      console.log(`File downloaded with state: ${result}`)
      resolve();
    }).catch((error) => {
      console.log(error);
      reject(error);
    });
  })
}

function getFolderContent(folderId) {
  return new Promise(async (resolve, reject) => {
    const headers = await setHeaders();

    fetch(`${REACT_APP_API_URL || 'https://cloud.internxt.com'}/api/storage/folder/${folderId}`, {
      method: "GET",
      headers
    })
      .then(response => response.json())
      .then(data => {
        resolve(data);
      })
      .catch(err => {
        reject("[file.service] Could not get folder content", err);
      });
  });
}

function createFolder(parentFolderId, folderName = "Untitled folder") {
  return new Promise(async (resolve, reject) => {
    const headers = await setHeaders();

    fetch(`${REACT_APP_API_URL || 'https://cloud.internxt.com'}/api/storage/folder`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        parentFolderId,
        folderName
      })
    }).then(response => response.json())
      .then(async response => {
        const newFolderDetails = await getFolderContent(response.id);
        resolve(newFolderDetails);
      }).catch(error => {
        reject("[file.service] Could not create folder", error);
      });
  });
}

function updateFolderMetadata(metadata, folderId) {
  return new Promise(async (resolve, reject) => {
    const headers = await setHeaders();
    const data = JSON.stringify({ metadata });

    fetch(`${REACT_APP_API_URL || 'https://cloud.internxt.com'}/api/storage/folder/${folderId}/meta`, {
      method: "POST",
      headers,
      body: data
    }).then(() => { resolve(); })
      .catch((error) => { reject(error); });
  });
}

function getSortFunction(sortType) {
  // Sort items depending on option selected
  let sortFunc = null;
  switch (sortType) {
      case sortTypes.DATE_ADDED:
          sortFunc = function(a, b) { return a.id > b.id };
          break;
      case sortTypes.FILETYPE_ASC:
          sortFunc = function(a, b) { return a.type ? a.type.toLowerCase().localeCompare(b.type.toLowerCase()) : true };
          break;
      case sortTypes.FILETYPE_DESC:
          sortFunc = function(a, b) { return b.type ? b.type.toLowerCase().localeCompare(a.type.toLowerCase()) : true };
          break;
      case sortTypes.NAME_ASC:
          sortFunc = function(a, b) { return a.name.toLowerCase().localeCompare(b.name.toLowerCase()) };
          break;
      case sortTypes.NAME_DESC:
          sortFunc = function(a, b) { return b.name.toLowerCase().localeCompare(a.name.toLowerCase()) };
          break;
      case sortTypes.SIZE_ASC:
          sortFunc = function(a, b) { return a.size ? a.size - b.size : true };
          break;
      case sortTypes.SIZE_DESC:
          sortFunc = function(a, b) { return b.size ? b.size - a.size : true };
          break;
      default:
          break;
  }
  return sortFunc;
}
