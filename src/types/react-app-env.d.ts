declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV: 'development' | 'production' | 'test';
    REACT_NATIVE_CRYPTO_SECRET: string;
    REACT_NATIVE_API_URL: string;
    REACT_NATIVE_BRIDGE_URL: string;
    REACT_NATIVE_PHOTOS_API_URL: string;
    REACT_NATIVE_PHOTOS_NETWORK_API_URL: string;
    REACT_NATIVE_SEGMENT_API: string;
    REACT_NATIVE_SEGMENT_API_DEV: string;
    REACT_NATIVE_CRYPTO_SECRET2: string;
    REACT_NATIVE_MAGIC_IV: string;
    REACT_NATIVE_MAGIC_SALT: string;
    REACT_NATIVE_RECAPTCHA_V3: string;
  }
}
