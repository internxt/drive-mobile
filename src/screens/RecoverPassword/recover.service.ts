import { deviceStorage, encryptText, encryptTextWithKey, passToHash } from '../../helpers';
import { getHeaders } from '../../helpers/headers';

export async function doRecoverPassword(newPassword: string): Promise<Response> {
  const xUser = await deviceStorage.getUser();

  const mnemonic = xUser.mnemonic;
  const hashPass = passToHash({ password: newPassword });

  const encryptedPassword = encryptText(hashPass.hash);
  const encryptedSalt = encryptText(hashPass.salt);
  const encryptedMnemonic = encryptTextWithKey(mnemonic, newPassword);

  return fetch(`${process.env.REACT_NATIVE_API_URL}/api/user/recover`, {
    method: 'patch',
    headers: await getHeaders(),
    body: JSON.stringify({
      password: encryptedPassword,
      salt: encryptedSalt,
      mnemonic: encryptedMnemonic,
      privateKey: null
    })
  });
}