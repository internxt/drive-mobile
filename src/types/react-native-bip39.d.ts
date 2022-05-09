declare module 'react-native-bip39' {
  const validateMnemonic: (mnemonic: string, wordlist?: string) => boolean;

  export {
    mnemonicToSeed,
    validateMnemonic
  };
}
