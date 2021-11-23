import { decryptText, encryptText, encryptTextWithKey, passToHash, getAnalyticsData } from '../../helpers';
import { getHeaders } from '../../helpers/headers';
import { isJsonString } from '../SignUpScreen/registerUtils';
import AesUtils from '../../helpers/aesUtils';
interface ChangePasswordParam {
  password: string;
  newPassword: string;
}

async function getSalt(email) {
  const response = await fetch(`${process.env.REACT_NATIVE_API_URL}/api/login`, {
    method: 'post',
    headers: await getHeaders(),
    body: JSON.stringify({ email }),
  });
  const data = await response.json();
  const salt = decryptText(data.sKey);

  return salt;
}

export async function doChangePassword(params: ChangePasswordParam) {
  const xUser = await getAnalyticsData();
  const salt = await getSalt(xUser.email);

  if (!salt) {
    throw new Error('Internal server error. Please try later.');
  }
  const hashedCurrentPassword = passToHash({ password: params.password, salt }).hash;
  const encCurrentPass = encryptText(hashedCurrentPassword);

  const hashedNewPassword = passToHash({ password: params.newPassword });
  const encNewPass = encryptText(hashedNewPassword.hash);
  const encryptedNewSalt = encryptText(hashedNewPassword.salt);

  const encryptedMnemonic = encryptTextWithKey(xUser.mnemonic, params.newPassword);

  let privateKeyEncrypted;

  try {
    const privateKey = Buffer.from(xUser.privateKey, 'base64').toString();

    privateKeyEncrypted = AesUtils.encrypt(privateKey, params.newPassword);
  } catch (err) {
    console.log('Error encrypting private key: ', err);
  }

  return fetch(`${process.env.REACT_NATIVE_API_URL}/api/user/password`, {
    method: 'PATCH',
    headers: await getHeaders(),
    body: JSON.stringify({
      currentPassword: encCurrentPass,
      newPassword: encNewPass,
      newSalt: encryptedNewSalt,
      mnemonic: encryptedMnemonic,
      privateKey: privateKeyEncrypted,
    }),
  }).then(async (res) => {
    if (res.status === 200) {
      return res.json();
    } else {
      const body = await res.text();
      const json = isJsonString(body);

      if (json) {
        throw Error(json.error);
      } else {
        throw Error(body);
      }
    }
  });
}
