import { deviceStorage, inxt } from "../helpers";
import { sortTypes } from "../constants";
const { REACT_APP_API_URL } = process && process.env;

export const fileService = {
  downloadFile,
  getFolderContent,
  createFolder,
  updateFolderMetadata,
  getSortFunction,
  moveFile,
  deleteItems
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
        if (response.error) {
          reject(response.error)
        } else {
          const newFolderDetails = await getFolderContent(response.id);
          resolve(newFolderDetails);
        }
      }).catch(error => {
        reject("[file.service] Could not create folder", error);
      });
  });
}

function updateFolderMetadata(metadata, folderId) {
  return new Promise(async (resolve, reject) => {
    const headers = await setHeaders();
    const data = JSON.stringify({ metadata });

    fetch(`${process && process.env && process.env.REACT_APP_API_URL || 'https://cloud.internxt.com'}/api/storage/folder/${folderId}/meta`, {
      method: "POST",
      headers,
      body: data
    }).then(() => { resolve(); })
      .catch((error) => { reject(error); });
  });
}

async function moveFile(fileId, destination) {
  try {
    const headers = await setHeaders();
    const data = JSON.stringify({
      fileId,
      destination
    })

    const res = await fetch(`${REACT_APP_API_URL || 'https://cloud.internxt.com'}/api/storage/moveFile`, {
      method: "POST",
      headers,
      body: data
    });
    if (res.status === 200) {
      return 1;
    } else {
      const data = await res.json();
      return data.message;
    }
  } catch(error) {
    console.log(`Error moving file: ${error.message ? error.message : error}`)
    return error;
  }
}

function deleteItems(items) {
  return new Promise((resolve, reject) => {

    let fetchArray = [];

    items.forEach(async item => {
      const isFolder = !(item.fileId);
      const headers = await setHeaders();
      const url = isFolder ? `${process && process.env && process.env.REACT_APP_API_URL}/api/storage/folder/${item.id}` : `${process && process.env && process.env.REACT_APP_API_URL}/api/storage/bucket/${item.bucket}/file/${item.fileId}`

      const fetchObj = fetch(url, {
        method: 'DELETE',
        headers
      });

      fetchArray.push(fetchObj);
    });

    Promise.all(fetchArray).then(() => resolve()).catch((err) => reject(err));
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
