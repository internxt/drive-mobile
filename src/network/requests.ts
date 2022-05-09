import { sha256 } from '../@inxt-js/lib/crypto';

export type NetworkCredentials = { user: string, pass: string };
export type NetworkAuth = { username: string, password: string };

export function getAuthFromCredentials(creds: NetworkCredentials): NetworkAuth {
  return {
    username: creds.user,
    password: sha256(Buffer.from(creds.pass)).toString('hex'),
  };
}
