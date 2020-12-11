import { deviceStorage } from "../../helpers";
import { getHeaders } from "../../helpers/headers";

async function setHeaders() {
    const token = await deviceStorage.getItem('xToken');
    const user = JSON.parse(await deviceStorage.getItem('xUser') || '{}');

    return getHeaders(token || ``)
}



export async function updateFolderMetadata(metadata: any, folderId: number) {
    const headers = await setHeaders()
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

export async function updateFileMetadata(metadata: any, fileId: number) {
    const headers = await setHeaders()
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