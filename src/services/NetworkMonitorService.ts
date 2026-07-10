import { logger } from '@internxt-mobile/services/common';
import * as Network from 'expo-network';

export { NetworkStateType } from 'expo-network';
export type NetworkState = Network.NetworkState;
export type NetworkStateCallback = (state: NetworkState) => void;

class NetworkMonitorService {
  private readonly subscribers = new Set<NetworkStateCallback>();
  private isListening = false;

  getNetworkStateAsync = (): Promise<NetworkState> => Network.getNetworkStateAsync();

  subscribe = (callback: NetworkStateCallback): (() => void) => {
    this.ensureNativeListener();
    this.subscribers.add(callback);

    return () => {
      this.subscribers.delete(callback);
    };
  };

  private ensureNativeListener = () => {
    if (this.isListening) {
      return;
    }
    this.isListening = true;
    // The subscription is intentionally never removed: on iOS the module
    // cancels its NWPathMonitor when the last listener is removed, and a cancelled
    // NWPathMonitor cannot be restarted, so any listener added afterwards never fires.
    Network.addNetworkStateListener((state) => {
      this.subscribers.forEach((callback) => {
        try {
          callback(state);
        } catch (error) {
          logger.error('[NetworkMonitor] Subscriber callback failed', { error });
        }
      });
    });
  };
}

export const networkMonitorService = new NetworkMonitorService();
