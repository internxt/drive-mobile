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

function createFolder(currentFolderId, newFolderName = "Untitled folder") {
  return new Promise((resolve, reject) => {
    fetch(`${API_URL}/api/storage/folder`, {
      method: "post",
      headers: {
        "content-type": "application/json; charset=utf-8",
        Authorization: `Bearer xxx`
        // "internxt-mnemonic": "xxx"
      },
      body: JSON.stringify({
        parentFolderId: currentFolderId,
        folderName: newFolderName
      })
    })
      .then(res => res.json())
      .then(res => {
        resolve(res);
      })
      .catch(err => {
        reject("[file.service] Could not gcreate folder", err);
      });
  });
}

// const filesMock = [
//   {
//     id: 1,
//     parent: 0,
//     name: "Presentations",
//     type: "FOLDER",
//     size: "20MB",
//     added: 1539783819,
//     style: {
//       color: "purple",
//       icon: ""
//     }
//   },
//   {
//     id: 2,
//     parent: 0,
//     name: "California Holiday",
//     type: "FOLDER",
//     size: "47MB",
//     added: 1539783819,
//     style: {
//       color: "blue",
//       icon: ""
//     }
//   },
//   {
//     id: 3,
//     parent: 0,
//     name: "Favourite Films",
//     type: "FOLDER",
//     size: "2000MB",
//     added: 1539783819,
//     style: {
//       color: "pink",
//       icon: ""
//     }
//   },
//   {
//     id: 4,
//     parent: 0,
//     name: "Salaries",
//     type: "FOLDER",
//     size: "20MB",
//     added: 1539783819,
//     style: {
//       color: "yellow",
//       icon: ""
//     }
//   },
//   {
//     id: 5,
//     parent: 1,
//     name: "Documents",
//     type: "FOLDER",
//     size: "20MB",
//     added: 1539783819,
//     items: [],
//     style: {
//       color: "purple",
//       icon: ""
//     }
//   },
//   {
//     id: 6,
//     parent: 1,
//     name: "California Holiday",
//     type: "FOLDER",
//     size: "25MB",
//     added: 1539783819,
//     items: [],
//     style: {
//       color: "blue",
//       icon: ""
//     }
//   },
//   {
//     id: 7,
//     parent: 1,
//     name: "Favourite Films",
//     type: "FOLDER",
//     size: "200MB",
//     added: 1539783819,
//     items: [],
//     style: {
//       color: "pink",
//       icon: ""
//     }
//   },
//   {
//     id: 8,
//     parent: 1,
//     name: "Website Inspiration",
//     type: "JPEG",
//     size: "2MB",
//     added: 1539783819,
//     style: {
//       color: "blue",
//       icon: ""
//     }
//   }
// ];
