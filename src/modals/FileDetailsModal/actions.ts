import { getHeaders } from '../../helpers/headers'

export async function updateFolderMetadata(metadata: any, folderId: number): Promise<void> {
  const headers = await getHeaders()

  return fetch(`${process.env.REACT_NATIVE_API_URL}/api/storage/folder/${folderId}/meta`, {
    method: 'post',
    headers: headers,
    body: JSON.stringify({ metadata })
  }).then(res => {
    if (res.status === 200) {
      return
    }
    throw Error(res.statusText)
  })
}

export async function updateFileMetadata(metadata: any, fileId: number): Promise<void> {
  const headers = await getHeaders()

  return fetch(`${process.env.REACT_NATIVE_API_URL}/api/storage/file/${fileId}/meta`, {
    method: 'post',
    headers: headers,
    body: JSON.stringify({ metadata })
  }).then(res => {
    if (res.status === 200) {
      return
    }
    throw Error(res.statusText)
  })
}