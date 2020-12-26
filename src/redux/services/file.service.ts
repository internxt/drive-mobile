import { deviceStorage } from '../../helpers';
import { sortTypes } from '../constants';
import { compare } from 'natural-orderby'

const { REACT_NATIVE_API_URL } = process && process.env;

export const fileService = {
  getFolderContent,
  createFolder,
  updateFolderMetadata,
  getSortFunction,
  moveFile,
  deleteItems
};

async function setHeaders() {
  const token = await deviceStorage.getItem('xToken');
  const user = JSON.parse(await deviceStorage.getItem('xUser') || '');
  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-type': 'application/json; charset=utf-8',
    'internxt-mnemonic': user.mnemonic
  };
  return headers;
}

function getFolderContent(folderId: number) {
  return new Promise(async (resolve, reject) => {
    const headers = await setHeaders();
    fetch(`${process.env.REACT_NATIVE_API_URL}/api/storage/folder/${folderId}`, {
      method: 'GET',
      headers
    }).then(res => {
      if (res.status !== 200) { throw res; }
      return res.json();
    }).then(resolve)
      .catch(reject);
  });
}

function createFolder(parentFolderId: number, folderName = 'Untitled folder') {
  return new Promise(async (resolve, reject) => {
    const headers = await setHeaders();
    const body = JSON.stringify({
      parentFolderId,
      folderName
    });

    fetch(`${process.env.REACT_NATIVE_API_URL}/api/storage/folder`, {
      method: 'POST',
      headers,
      body
    }).then(response => response.json())
      .then(async response => {
        if (response.error) {
          console.log('Create folder response error', response.error);
          reject(response.error);
        } else {
          resolve();
        }
      }).catch(error => {
        reject('[file.service] Could not create folder');
      });
  });
}

function updateFolderMetadata(metadata: any, folderId: string) {
  return new Promise(async (resolve, reject) => {
    const headers = await setHeaders();
    const data = JSON.stringify({ metadata });

    fetch(`${process.env.REACT_NATIVE_API_URL}/api/storage/folder/${folderId}/meta`, {
      method: 'POST',
      headers,
      body: data
    }).then(() => {
      resolve();
    }).catch(error => {
      reject(error);
    });
  });
}

async function moveFile(fileId: string, destination: string) {
  try {
    const headers = await setHeaders();
    const data = JSON.stringify({
      fileId,
      destination
    });

    const res = await fetch(`${process.env.REACT_NATIVE_API_URL}/api/storage/moveFile`, {
      method: 'POST',
      headers,
      body: data
    });
    
    if (res.status === 200) {
      return 1;
    } else {
      const data = await res.json();
      return data.message;
    }
  } catch (error) {
    console.log(`Error moving file: ${error.message ? error.message : error}`);
    return error;
  }
}

function deleteItems(items: any[]) {
  return new Promise((resolve, reject) => {
    let fetchArray: any[] = [];

    items.forEach(async (item: any) => {
      const isFolder = !item.fileId;
      const headers = await setHeaders();
      const url = isFolder
        ? `${process.env.REACT_NATIVE_API_URL}/api/storage/folder/${item.id}`
        : `${process.env.REACT_NATIVE_API_URL}/api/storage/bucket/${item.bucket
        }/file/${item.fileId}`;

      const fetchObj = fetch(url, {
        method: 'DELETE',
        headers
      });

      fetchArray.push(fetchObj);
    });

    Promise.all(fetchArray)
      .then(() => resolve())
      .catch(err => reject(err));
  });
}

function getSortFunction(sortType: string) {
  // Sort items depending on option selected
  let sortFunc = null;
  switch (sortType) {
    case sortTypes.DATE_ADDED:
      sortFunc = function (a: any, b: any) {
        return a.id > b.id;
      };
      break;
    case sortTypes.FILETYPE_ASC:
      sortFunc = function (a: any, b: any) {
        return a.type
          ? a.type.toLowerCase().localeCompare(b.type.toLowerCase())
          : true;
      };
      break;
    case sortTypes.FILETYPE_DESC:
      sortFunc = function (a: any, b: any) {
        return b.type
          ? b.type.toLowerCase().localeCompare(a.type.toLowerCase())
          : true;
      };
      break;
    case sortTypes.NAME_ASC:
      sortFunc = function (a: any, b: any) {
        return compare({order:'asc'})(a.name.toLowerCase(),b.name.toLowerCase())
      };
      break;
    case sortTypes.NAME_DESC:
      sortFunc = function (a: any, b: any) {
        return compare({order:'desc'})(a.name.toLowerCase(),b.name.toLowerCase())
      };
      break;
    case sortTypes.SIZE_ASC:
      sortFunc = function (a: any, b: any) {
        return a.size ? a.size - b.size : true;
      };
      break;
    case sortTypes.SIZE_DESC:
      sortFunc = function (a: any, b: any) {
        return b.size ? b.size - a.size : true;
      };
      break;
    default:
      break;
  }
  return sortFunc;
}
