import { sortTypes } from '../constants';
import { compare } from 'natural-orderby'
import { previewsStorage } from '../../helpers/previewsStorage';
import { getHeaders } from '../../helpers/headers';

export const photoService = {
  getSortFunction,
  getAlbumContent,
  getAllPhotosContent,
  getDeletedPhotos,
  deleteTempPhoto,
  createAlbum
};

// To obtain an AlbumView of an albumId
function getAlbumContent(albumId: number): Promise<any> {
  return new Promise(async (resolve, reject) => {
    const headers = await getHeaders();

    fetch(`${process.env.REACT_NATIVE_PHOTOS_API_URL}/api/photos/storage/album/${albumId}`, {
      method: 'GET',
      headers
    }).then(res => {
      if (res.status !== 200) { throw res; }
      return res.json();
    }).then(resolve)
      .catch(reject);
  });
}

function getAllPhotosContent(user: any): Promise<any> {
  return new Promise(async (resolve, reject) => {
    const headers = await getHeaders();

    fetch(`${process.env.REACT_NATIVE_PHOTOS_API_URL}/api/photos/storage/previews/${user.email}`, {
      method: 'GET',
      headers
    }).then(res => {
      if (res.status !== 200) { throw res; }
      return res.json();
    }).then(async (res2) => {
      if (res2) {

        const completedPhotos = await previewsStorage.matchPreviews(res2);

        resolve(completedPhotos)
      }
      resolve('');
    })
      .catch(reject);
  });
}

function getDeletedPhotos(user: any): Promise<any> {
  return new Promise(async (resolve, reject) => {
    const headers = await getHeaders();

    fetch(`${process.env.REACT_NATIVE_PHOTOS_API_URL}/api/photos/storage/deletes/${user.email}`, {
      method: 'GET',
      headers
    }).then(res => {
      if (res.status !== 200) { throw res; }
      return res.json();
    }).then(async (res2) => {
      if (res2) {
        const completedPhotos = await previewsStorage.matchPreviews(res2);

        resolve(completedPhotos)
      }
      resolve('');
    })
      .catch(reject);
  });
}

function createAlbum(name: any, photos: any): Promise<any> {
  return new Promise(async (resolve, reject) => {
    const headers = await getHeaders();

    fetch(`${process.env.REACT_NATIVE_PHOTOS_API_URL}/api/photos/album`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ name, photos })
    }).then(res => {
      if (res.status !== 200) { throw res; }
      return res.json();
    }).then(resolve)
      .catch(reject);
  });
}

function deleteTempPhoto(photoId: any): Promise<any> {
  return new Promise(async (resolve, reject) => {
    const headers = await getHeaders();

    fetch(`${process.env.REACT_NATIVE_PHOTOS_API_URL}/api/photos/delete/temp/photo`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ photoId })
    }).then(res => {
      if (res.status !== 200) { throw res; }
      return res.json();
    }).then(resolve)
      .catch(reject);
  });
}

type ArraySortFunction = (a: any, b: any) => boolean

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