import { getHeaders } from '../../helpers/headers';
import { isJsonString } from '../../screens/Register/registerUtils';
export interface renameMeta {
  newName: string,
  itemId: number | string,
  ifFolder: boolean
}

export async function rename(params: renameMeta): Promise<any> {
  const url = params.ifFolder ? `${process.env.REACT_NATIVE_API_URL}/api/storage/folder/${params.itemId}/meta`
    : `${process.env.REACT_NATIVE_API_URL}/api/storage/file/${params.itemId}/meta`

  return fetch(url, {
    method: 'post',
    headers: await getHeaders(),
    body: JSON.stringify({
      metadata: {
        itemName: params.newName
      }
    })
  }).then(async res => {
    if (res.status === 200) {
      return res.json()
    } else {
      const body = await res.text()
      const json = isJsonString(body)

      if (json && json.error) {
        throw Error(json.error)
      } else {
        throw Error(body)
      }
    }
  })
}
