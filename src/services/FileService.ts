import { sortTypes } from '../redux/constants';
import { compare } from 'natural-orderby'
import { IFile, IFolder } from '../components/FileList';
import { getHeaders } from '../helpers/headers';
import { IMetadata } from '../components/modals/FileDetailsModal/actions';

function getFolderContent(folderId: number): Promise<any> {
  return new Promise(async (resolve, reject) => {
    const headers = await getHeaders();

    fetch(`${process.env.REACT_NATIVE_API_URL}/api/storage/v2/folder/${folderId}`, {
      method: 'GET',
      headers
    }).then(res => {
      if (res.status !== 200) { throw res; }

      return res.json();
    }).then(resolve)
      .catch(reject);
  });
}

function createFolder(parentFolderId: number, folderName = 'Untitled folder'): Promise<void> {
  return new Promise(async (resolve, reject) => {
    const headers = await getHeaders();
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
          reject(response.error);
        } else {
          resolve();
        }
      }).catch(() => {
        reject('[file.service] Could not create folder');
      });
  });
}

function updateFolderMetadata(metadata: IMetadata, folderId: string): Promise<Response> {
  return new Promise(async (resolve, reject) => {
    const headers = await getHeaders();
    const data = JSON.stringify({ metadata });

    fetch(`${process.env.REACT_NATIVE_API_URL}/api/storage/folder/${folderId}/meta`, {
      method: 'POST',
      headers,
      body: data
    }).then((res) => {
      resolve(res);
    }).catch(error => {
      reject(error);
    });
  });
}

async function moveFile(fileId: string, destination: string): Promise<number> {
  try {
    const headers = await getHeaders();
    const data = JSON.stringify({ fileId, destination });

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
    return error;
  }
}

function deleteItems(items: any[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const fetchArray: any[] = [];

    items.forEach(async (item: IFile & IFolder) => {
      const isFolder = !item.fileId;
      const headers = await getHeaders();
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

    return Promise.all(fetchArray)
      .then(() => resolve())
      .catch(err => reject(err));
  });
}

export type ArraySortFunction = (a: any, b: any) => boolean

function getSortFunction(sortType: string): ArraySortFunction | null {
  let sortFunc: any = null;

  switch (sortType) {
  case sortTypes.DATE_ADDED:
    sortFunc = (a: any, b: any) => a.id > b.id;
    break;
  case sortTypes.FILETYPE_ASC:
    sortFunc = (a: any, b: any) => {
      return a.type
        ? a.type.toLowerCase().localeCompare(b.type.toLowerCase())
        : true;
    };
    break;
  case sortTypes.FILETYPE_DESC:
    sortFunc = (a: any, b: any) => {
      return b.type
        ? b.type.toLowerCase().localeCompare(a.type.toLowerCase())
        : true;
    };
    break;
  case sortTypes.NAME_ASC:
    sortFunc = (a: any, b: any) => {
      return compare({ order: 'asc' })(a.name.toLowerCase(), b.name.toLowerCase())
    };
    break;
  case sortTypes.NAME_DESC:
    sortFunc = (a: any, b: any) => {
      return compare({ order: 'desc' })(a.name.toLowerCase(), b.name.toLowerCase())
    };
    break;
  case sortTypes.SIZE_ASC:
    sortFunc = (a: any, b: any) => a.size ? a.size - b.size : true;
    break;
  case sortTypes.SIZE_DESC:
    sortFunc = (a: any, b: any) => b.size ? b.size - a.size : true;
    break;
  default:
    break;
  }
  return sortFunc;
}

export const fileService = {
  getFolderContent,
  createFolder,
  updateFolderMetadata,
  getSortFunction,
  moveFile,
  deleteItems
};