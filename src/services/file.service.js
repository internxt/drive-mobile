import { deviceStorage, inxt } from "../helpers";
const { REACT_APP_API_URL } = process.env;

export const fileService = {
  downloadFile,
  getFolderContent,
  createFolder
};

async function setHeaders() {
  const token = await deviceStorage.getItem('xToken');
  const user = await deviceStorage.getItem('xUser');
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-type": "application/json; charset=utf-8",
    "internxt-mnemonic": user.mnemonic
  }
  return headers;
}

function downloadFile(user, file) {
  return new Promise((resolve, reject) => {
    inxt.resolveFile(user, file).then((result) => {
      console.log(`File downloaded with state: ${result}`)
      resolve();
    }).catch((error) => {
      console.log(error);
      reject(error);
    });
  })
}

function getFolderContent(folderId) {
  return new Promise(async (resolve, reject) => {
    const headers = await setHeaders();

    console.log(headers);

    fetch(`${REACT_APP_API_URL}/api/storage/folder/${folderId}`, {
      method: "GET",
      headers
    })
      .then(response => response.json())
      .then(data => {
        resolve(data);
      })
      .catch(err => {
        reject("[file.service] Could not get folder content", err);
      });
  });
}

function createFolder(parentFolderId, folderName = "Untitled folder") {
  return new Promise(async (resolve, reject) => {
    const headers = await setHeaders();

    fetch(`${REACT_APP_API_URL}/api/storage/folder`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        parentFolderId,
        folderName
      })
    }).then(response => response.json())
      .then(async response => {
        const newFolderDetails = await getFolderContent(response.id);
        resolve(newFolderDetails);
      }).catch(error => {
        reject("[file.service] Could not create folder", error);
      });
  });
}
