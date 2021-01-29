import { deviceStorage } from '../../helpers';
import { sortTypes } from '../constants';
import { compare } from 'natural-orderby'
import { IFile, IFolder } from '../../components/FileList';

export const photoService = {
  getSortFunction,
  setHeaders,
  getAlbumContent,
  getFolderContent
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



// To obtain an AlbumView of an albumId
function getAlbumContent(albumId: number): Promise<any> {
  return new Promise(async (resolve, reject) => {
    const headers = await setHeaders();

    fetch(`${process.env.REACT_NATIVE_API_URL}/api/photos/storage/album/${albumId}`, {
      method: 'GET',
      headers
    }).then(res => {
      if (res.status !== 200) { throw res; }
      return res.json();
    }).then(resolve)
      .catch(reject);
  });
}

function getFolderContent(user: any): Promise<any> {
  return new Promise(async (resolve, reject) => {
    const headers = await setHeaders();

    fetch(`${process.env.REACT_NATIVE_API_URL}/api/photos/storage/previews/${user.email}`, {
      method: 'GET',
      headers
    }).then(res => {
      if (res.status !== 200) { throw res; }
      return res.json();
    }).then(resolve)
      .catch(reject);
  });
}

export type ArraySortFunction = (a: any, b: any) => boolean

function getSortFunction(sortType: string): ArraySortFunction | null {
  let sortFunc = null;

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