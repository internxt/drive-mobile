import Axios from 'axios';
import { getHeaders } from '../../../helpers/headers';
import { constants } from '../../../services/app';

interface CreateFolderParam {
  folderName: string;
  parentId: number;
}

export async function createFolder(params: CreateFolderParam): Promise<any> {
  const headers = await getHeaders();
  const headersMap: Record<string, string> = {};

  headers.forEach((value: string, key: string) => {
    headersMap[key] = value;
  });

  return Axios.post(
    `${constants.REACT_NATIVE_DRIVE_API_URL}/api/storage/folder`,
    {
      parentFolderId: params.parentId,
      folderName: params.folderName,
    },
    {
      headers: headersMap,
    },
  );
}
