declare namespace NodeJS {
  interface ProcessEnv {
      NODE_ENV: 'development' | 'production' | 'test'
      REACT_NATIVE_CRYPTO_SECRET: string
  }
}
