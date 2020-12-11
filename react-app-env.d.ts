declare namespace NodeJS {
  interface ProcessEnv {
      NODE_ENV: 'development' | 'production' | 'test'
      REACT_NATIVE_CRYPTO_SECRET: string
      REACT_NATIVE_API_URL: string
      REACT_NATIVE_BRIDGE_URL: string
      REACT_NATIVE_SEGMENT_API: string
      REACT_NATIVE_SEGMENT_API_DEV: string
  }
}
