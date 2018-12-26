import { deviceStorage } from "../helpers";

export const userService = {
  signin
};

function signin() {
  return new Promise(async resolve => {
    await deviceStorage.saveItem("token", mockUser.token);
    return resolve(mockUser);
  });
}

const mockUser = {
  user: {
    id: 3,
    userId: "$2a$08$wNBgek68hOR/Vxi7nuHrf.vbMnxbhgBBfq89JWwfeJPg4oFtPgzDu",
    email: "ruzicic@gmail.com",
    mnemonic:
      "erase catch smooth vote memory mix sail employ sell brave rose human loan feel flat okay blame picture song reflect repair leopard nasty sting",
    root_folder_id: 2,
    isFreeTier: true
  },
  token:
    "eyJhbGciOiJIUzI1NiJ9.cnV6aWNpY0BnbWFpbC5jb20.IihmSJh08QGL3cc7j57Maykzp9dKE7FOIqG_ue4EL3s"
};
