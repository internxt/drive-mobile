import { getHeaders } from '../../../helpers/headers';
import { isJsonString } from '../../../screens/SignUpScreen/registerUtils';
import { constants } from '../../../services/app';

interface CreateFolderParam {
  folderName: string;
  parentId: number;
}

export async function createFolder(params: CreateFolderParam): Promise<any> {
  return fetch(`${constants.REACT_NATIVE_DRIVE_API_URL}/api/storage/folder`, {
    method: 'post',
    headers: await getHeaders(),
    body: JSON.stringify({
      parentFolderId: params.parentId,
      folderName: params.folderName,
    }),
  }).then(async (res) => {
    if (res.status === 201) {
      return res.json();
    } else {
      const body = await res.text();
      const json = isJsonString(body);

      if (json) {
        throw Error(json.error);
      } else {
        throw Error(body);
      }
    }
  });
}
