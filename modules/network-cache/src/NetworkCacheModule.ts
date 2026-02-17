import { requireNativeModule } from 'expo-modules-core';

interface NetworkCacheModuleType {
  clearNetworkCache(): Promise<boolean>;
}

export default requireNativeModule<NetworkCacheModuleType>('NetworkCache');
