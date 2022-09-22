import { constants } from '../../services/AppService';

interface GenerateShareLinkResponse {
  token: string;
}

interface GenerateShareLinkRequestBody {
  isFolder: boolean;
  views: number;
  encryptionKey: string;
  fileToken: string;
  bucket: string;
}

interface GetShareInfoResponse {
  user: string;
  token: string;
  file: string;
  encryptionKey: string;
  mnemonic: string;
  isFolder: boolean;
  views: number;
  bucket: string;
  fileToken: string;
  fileMeta: {
    folderId: string;
    name: string;
    type: string;
    size: number;
  };
}

export function generateShareLink(
  headers: Headers,
  fileId: string,
  params: GenerateShareLinkRequestBody,
): Promise<string> {
  return fetch(`${constants.DRIVE_API_URL}/storage/share/file/${fileId}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(params),
  })
    .then((res) => {
      return res.json();
    })
    .then((res: GenerateShareLinkResponse) => res.token);
}

export function getShareInfo(token: string): Promise<GetShareInfoResponse> {
  return fetch(`${constants.DRIVE_API_URL}/storage/share/${token}`).then<GetShareInfoResponse>((res) => res.json());
}

const shareService = {
  generateShareLink,
  getShareInfo,
};

export default shareService;
