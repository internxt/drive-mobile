import { decryptText, encryptText, encryptTextWithKey, passToHash } from '../../helpers';
import { getHeaders } from '../../helpers/headers';
import { constants } from '../../services/app';

interface RegisterParams {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  captcha: string;
}

export async function getNewBits(): Promise<string> {
  return fetch(`${constants.REACT_NATIVE_DRIVE_API_URL}/api/bits`)
    .then((res) => res.json())
    .then((res) => res.bits)
    .then((bits) => decryptText(bits));
}

export async function doRegister(params: RegisterParams): Promise<any> {
  const hashObj = passToHash({ password: params.password });
  const encPass = encryptText(hashObj.hash);
  const encSalt = encryptText(hashObj.salt);
  const mnemonic = await getNewBits();
  const encMnemonic = encryptTextWithKey(mnemonic, params.password);
  const url = `${constants.REACT_NATIVE_DRIVE_API_URL}/api/register`;

  return fetch(url, {
    method: 'post',
    headers: await getHeaders(),
    body: JSON.stringify({
      name: params.firstName,
      lastname: params.lastName,
      email: params.email.toLowerCase(),
      password: encPass,
      mnemonic: encMnemonic,
      salt: encSalt,
      referral: null,
      captcha: params.captcha,
    }),
  }).then(async (res) => {
    if (res.status === 200) {
      return res.json();
    } else {
      const body = await res.text();
      const json = JSON.parse(body);

      if (json) {
        throw Error(json.message);
      } else {
        throw Error(body);
      }
    }
  });
}
