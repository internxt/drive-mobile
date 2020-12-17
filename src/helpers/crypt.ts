import CryptoJS from 'crypto-js'

const password = process && process.env && process.env.REACT_NATIVE_CRYPTO_SECRET || ''; // Force env var loading

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

// AES Plain text encryption method
export function encryptText(textToEncrypt: string) {
  return encryptTextWithKey(textToEncrypt, password);
}

// AES Plain text decryption method
export function decryptText(encryptedText: string) {
  return decryptTextWithKey(encryptedText, password);
}

// AES Plain text encryption method with enc. key
export function encryptTextWithKey(textToEncrypt: string, keyToEncrypt: string) {
  try {
    const bytes = CryptoJS.AES.encrypt(textToEncrypt, keyToEncrypt).toString();
    const text64 = CryptoJS.enc.Base64.parse(bytes);
    return text64.toString(CryptoJS.enc.Hex);
  } catch (error) {
    throw new Error(error);
  }
}

// AES Plain text decryption method with enc. key
export function decryptTextWithKey(encryptedText: string, keyToDecrypt: string) {
  try {
    const reb = CryptoJS.enc.Hex.parse(encryptedText); //convierte string a hexadecimal
    const bytes = CryptoJS.AES.decrypt(
      reb.toString(CryptoJS.enc.Base64),//convierte de string a base 64 
      keyToDecrypt
    );
    try {
      return bytes.toString(CryptoJS.enc.Utf8);
    } catch {
      return decryptTextWithKey(encryptedText, keyToDecrypt)
    }
  } catch (error) {
    throw new Error(error);
  }
}

// Method to remove accents and other special characters from string
export function removeAccents(string: string) {
  const accents =
    'ÀÁÂÃÄÅĄĀāàáâãäåąßÒÓÔÕÕÖØŐòóôőõöøĎďDŽdžÈÉÊËĘèéêëęðÇçČčĆćÐÌÍÎÏĪìíîïīÙÚÛÜŰùűúûüĽĹŁľĺłÑŇŃňñńŔŕŠŚŞšśşŤťŸÝÿýŽŻŹžżźđĢĞģğ';
  const accentsOut =
    'AAAAAAAAaaaaaaaasOOOOOOOOoooooooDdDZdzEEEEEeeeeeeCcCcCcDIIIIIiiiiiUUUUUuuuuuLLLlllNNNnnnRrSSSsssTtYYyyZZZzzzdGGgg';
  return string
    .split('')
    .map((letter, index) => {
      const accentIndex = accents.indexOf(letter);
      return accentIndex !== -1 ? accentsOut[accentIndex] : letter;
    })
    .join('');
}
