import { compare } from 'natural-orderby';
import { IFile, IFolder } from '../components/FileList';
import { getHeaders } from '../helpers/headers';
import { createHash } from 'crypto';
import axios from 'axios';
import { DriveFileMetadataPayload } from '../types';
import { REACT_NATIVE_DRIVE_API_URL } from '@env';

export const sortTypes = {
  DATE_ADDED: 'Date_Added',
  SIZE_ASC: 'Size_Asc',
  SIZE_DESC: 'Size_Desc',
  NAME_ASC: 'Name_Asc',
  NAME_DESC: 'Name_Desc',
  FILETYPE_ASC: 'File_Type_Asc',
  FILETYPE_DESC: 'File_Type_Asc',
};

export const UPLOAD_FILES_LIMIT = 1024 * 1024 * 1024;

async function getFolderContent(folderId: number): Promise<any> {
  const headers = await getHeaders();
  const headersMap: Record<string, string> = {};

  headers.forEach((value: string, key: string) => {
    headersMap[key] = value;
  });

  const response = await axios.get(`${REACT_NATIVE_DRIVE_API_URL}/api/storage/v2/folder/${folderId}`, {
    headers: headersMap,
  });

  return response.data;
}

async function createFolder(parentFolderId: number, folderName = 'Untitled folder'): Promise<void> {
  const headers = await getHeaders();
  const body = JSON.stringify({
    parentFolderId,
    folderName,
  });
  const response = await fetch(`${REACT_NATIVE_DRIVE_API_URL}/api/storage/folder`, {
    method: 'POST',
    headers,
    body,
  }).then((response) => response.json());

  if (response.error) {
    throw new Error(response.error);
  }
}

async function updateMetaData(
  fileId: string,
  metadata: DriveFileMetadataPayload,
  bucketId: string,
  relativePath: string,
): Promise<void> {
  const hashedRelativePath = createHash('ripemd160').update(relativePath).digest('hex');
  const headers = await getHeaders();
  const headersMap: Record<string, string> = {};

  headers.forEach((value: string, key: string) => {
    headersMap[key] = value;
  });

  return axios
    .post(
      `${REACT_NATIVE_DRIVE_API_URL}/api/storage/file/${fileId}/meta`,
      {
        metadata,
        bucketId,
        relativePath: hashedRelativePath,
      },
      { headers: headersMap },
    )
    .then(() => undefined);
}

async function moveFile(fileId: string, destination: number): Promise<number> {
  const headers = await getHeaders();
  const data = JSON.stringify({ fileId, destination });

  const res = await fetch(`${REACT_NATIVE_DRIVE_API_URL}/api/storage/moveFile`, {
    method: 'POST',
    headers,
    body: data,
  });

  if (res.status === 200) {
    return 1;
  } else {
    const data = await res.json();

    return data.message;
  }
}

async function deleteItems(items: any[]): Promise<void> {
  const fetchArray: any[] = [];

  for (const item of items) {
    const isFolder = !item.fileId;
    const headers = await getHeaders();
    const url = isFolder
      ? `${REACT_NATIVE_DRIVE_API_URL}/api/storage/folder/${item.id}`
      : `${REACT_NATIVE_DRIVE_API_URL}/api/storage/bucket/${item.bucket}/file/${item.fileId}`;

    const fetchObj = fetch(url, {
      method: 'DELETE',
      headers,
    });

    fetchArray.push(fetchObj);
  }

  return Promise.all(fetchArray).then(() => undefined);
}

export type ArraySortFunction = (a: IFolder | IFile, b: IFolder | IFile) => number;

function getSortFunction(sortType: string): ArraySortFunction | null {
  let sortFunc: any = null;

  switch (sortType) {
    case sortTypes.DATE_ADDED:
      sortFunc = (a: any, b: any) => a.id > b.id;
      break;
    case sortTypes.FILETYPE_ASC:
      sortFunc = (a: any, b: any) => {
        return a.type ? a.type.toLowerCase().localeCompare(b.type.toLowerCase()) : true;
      };
      break;
    case sortTypes.FILETYPE_DESC:
      sortFunc = (a: any, b: any) => {
        return b.type ? b.type.toLowerCase().localeCompare(a.type.toLowerCase()) : true;
      };
      break;
    case sortTypes.NAME_ASC:
      sortFunc = (a: any, b: any) => {
        return compare({ order: 'asc' })(a.name.toLowerCase(), b.name.toLowerCase());
      };
      break;
    case sortTypes.NAME_DESC:
      sortFunc = (a: any, b: any) => {
        return compare({ order: 'desc' })(a.name.toLowerCase(), b.name.toLowerCase());
      };
      break;
    case sortTypes.SIZE_ASC:
      sortFunc = (a: any, b: any) => (a.size ? a.size - b.size : true);
      break;
    case sortTypes.SIZE_DESC:
      sortFunc = (a: any, b: any) => (b.size ? b.size - a.size : true);
      break;
    default:
      break;
  }
  return sortFunc;
}

async function renameFileInNetwork(fileId: string, bucketId: string, relativePath: string): Promise<void> {
  const hashedRelativePath = createHash('ripemd160').update(relativePath).digest('hex');
  const headers = await getHeaders();
  const headersMap: Record<string, string> = {};

  headers.forEach((value: string, key: string) => {
    headersMap[key] = value;
  });

  await axios.post<{ message: string }>(
    `${REACT_NATIVE_DRIVE_API_URL}/api/storage/rename-file-in-network`,
    {
      fileId,
      bucketId,
      relativePath: hashedRelativePath,
    },
    { headers: headersMap },
  );
}

const fileService = {
  getFolderContent,
  createFolder,
  getSortFunction,
  moveFile,
  deleteItems,
  updateMetaData,
  renameFileInNetwork,
};

export default fileService;
