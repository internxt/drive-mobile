declare module 'react-native-network-bandwith-speed' {
  type NetworkBandwidthTestResults = { metric: string; speed: number };
  const measureConnectionSpeed: () => Promise<NetworkBandwidthTestResults>;

  export { NetworkBandwidthTestResults, measureConnectionSpeed };
}
