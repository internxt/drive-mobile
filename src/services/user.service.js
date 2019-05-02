import { deviceStorage, utils } from "../helpers";

const { REACT_APP_API_URL } = process.env;

export const userService = {
  signin,
  signout
};

function signin(email, password, sKey, twoFactorCode) {
  return new Promise((resolve, reject) => {
    // Manage credentials verification
    // Check password
    const salt = utils.decryptText(sKey);
    const hashObj = utils.passToHash({ password, salt });
    const encPass = utils.encryptText(hashObj.hash);

    fetch(`${REACT_APP_API_URL}/api/access`, {
      method: "POST",
      headers: { "content-type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        email,
        password: encPass,
        tfa: twoFactorCode
      })
    }).then(response => {
      if (response.status === 200) {
        // Manage successfull login
        response.json().then(async (body) => {
          const user = {
            userId: body.user.userId,
            email: email,
            mnemonic: body.user.mnemonic ? utils.decryptTextWithKey(body.user.mnemonic, password) : null,
            root_folder_id: body.user.root_folder_id,
            storeMnemonic: body.user.storeMnemonic,
            name: body.user.name,
            lastname: body.user.lastname
          };

          // Store login data
          await deviceStorage.saveItem('xToken', body.token);
          await deviceStorage.saveItem('xUser', JSON.stringify(user));

          resolve({ token: body.token, user });
        })
      } else {
        // Login error on access part
        throw new Error('Login access error');
      }
    }).catch(err => {
      reject("[user.service] Login failed", err);
    });
  });
};

async function signout() {
  try {
    // Delete login data
    await Promise.all([
      deviceStorage.deleteItem('xToken'),
      deviceStorage.deleteItem('xUser')
    ]);
  } catch (error) {
    console.log(error);
  }
};
