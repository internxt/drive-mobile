export const fileService = {
  getFiles
};

function getFiles({ id }) {
  return Promise.resolve({
    files: filesMock.filter(f => f.parent === id)
  });
}

const filesMock = [
  {
    parent: 0,
    name: "Presentations",
    type: "FOLDER",
    size: "20MB",
    added: 1539783819,
    items: [],
    style: {
      color: "",
      icon: ""
    }
  },
  {
    parent: 0,
    name: "California Holiday",
    type: "FOLDER",
    size: "47MB",
    added: 1539783819,
    items: [],
    style: {
      color: "",
      icon: ""
    }
  },
  {
    parent: 0,
    name: "Favourite Films",
    type: "FOLDER",
    size: "2000MB",
    added: 1539783819,
    items: [],
    style: {
      color: "",
      icon: ""
    }
  },
  {
    parent: 0,
    name: "Salaries",
    type: "FOLDER",
    size: "20MB",
    added: 1539783819,
    items: [],
    style: {
      color: "",
      icon: ""
    }
  }
];
