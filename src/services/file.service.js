import { deviceStorage } from "../helpers";

const { API_URL } = process.env;

export const fileService = {
  getFolderContent,
  createFolder
};

function getFolderContent(folderId) {
  return new Promise(async (resolve, reject) => {
    const token = await deviceStorage.getItem("token");

    fetch(`${API_URL}/api/storage/folder/${folderId}`, {
      method: "GET",
      headers: {
        "Content-type": "application/json; charset=utf-8",
        Authorization: `Bearer ${token}`
      }
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
    const token = await deviceStorage.getItem("token");

    fetch(`${API_URL}/api/storage/folder`, {
      method: "POST",
      headers: {
        "content-type": "application/json; charset=utf-8",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        parentFolderId,
        folderName
      })
    })
      .then(response => response.json())
      .then(async response => {
        const newFolderDetails = await getFolderContent(response.id);
        resolve(newFolderDetails);
      })
      .catch(error => {
        reject("[file.service] Could not create folder", error);
      });
  });
}
