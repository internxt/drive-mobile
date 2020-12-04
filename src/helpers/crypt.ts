import CryptoJS from 'crypto-js'

interface PassObjectInterface {
  password: string,
  salt?: string
}

export function passToHash(passObject: PassObjectInterface) {
  try {
    const salt = passObject.salt ? CryptoJS.enc.Hex.parse(passObject.salt) : CryptoJS.lib.WordArray.random(128 / 8);
    const hash = CryptoJS.PBKDF2(passObject.password, salt, { keySize: 256 / 32, iterations: 10000 });
    const hashedObjetc = {
      salt: salt.toString(),
      hash: hash.toString()
    }
    return hashedObjetc;
  } catch (error) {
    throw error;
  }
}
