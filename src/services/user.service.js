import { deviceStorage, utils } from "../helpers";

const { REACT_APP_API_URL } = process.env;

export const userService = {
  signin,
  signout,
  payment
};

function signin(email, password, sKey, twoFactorCode) {
  return new Promise((resolve, reject) => {
    // Manage credentials verification
    // Check password
    const salt = utils.decryptText(sKey);
    const hashObj = utils.passToHash({ password, salt });
    const encPass = utils.encryptText(hashObj.hash);

    fetch(`${process.env.REACT_APP_API_URL}/api/access`, {
      method: "POST",
      headers: { "content-type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        email,
        password: encPass,
        tfa: twoFactorCode
      })
    })
      .then(async response => {
        return { response, data: await response.json() }
      })
      .then(async response => {
        const body = response.data;

        if (response.response.status === 200) {
          // Manage successfull login
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
        } else {
          throw body.error ? body.error : 'Unkown error';
        }
      }).catch(err => {
        reject(err);
      });
  });
}

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
}

function payment(token, stripePlan) {
  return new Promise((resolve, reject) => {
    fetch(`${REACT_APP_API_URL}/api/buy`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        token: JSON.stringify(token),
        plan: stripePlan
      })
    }).then(async (response) => {
      const body = response.json();
      resolve(body.message);
    }).catch((error) => { reject(error); });
  })
}