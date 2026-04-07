import crypto from 'node:crypto';

export const pbkdf2 = (
  password: string,
  salt: string,
  rounds: number,
  derivedKeyLength: number,
): Promise<Buffer> =>
  Promise.resolve(crypto.pbkdf2Sync(password, salt, rounds, derivedKeyLength, 'sha512'));
