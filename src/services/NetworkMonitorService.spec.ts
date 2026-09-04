import * as Network from 'expo-network';
import { networkMonitorService } from './NetworkMonitorService';

jest.mock('expo-network', () => ({
  addNetworkStateListener: jest.fn().mockReturnValue({ remove: jest.fn() }),
  getNetworkStateAsync: jest.fn().mockResolvedValue({ type: 'WIFI', isConnected: true, isInternetReachable: true }),
}));

jest.mock('@internxt-mobile/services/common', () => ({
  logger: { error: jest.fn() },
}));

const emitNetworkState = (state: Partial<Network.NetworkState>) => {
  const nativeListener = (Network.addNetworkStateListener as jest.Mock).mock.calls[0][0];
  nativeListener(state);
};

const offlineState = { isConnected: false, isInternetReachable: false };

describe('network monitor service', () => {
  test('when the current network state is requested, then it is fetched from the native module', async () => {
    const state = await networkMonitorService.getNetworkStateAsync();

    expect(Network.getNetworkStateAsync).toHaveBeenCalled();
    expect(state).toEqual({ type: 'WIFI', isConnected: true, isInternetReachable: true });
  });

  test('when several subscribers are active and the network state changes, then all of them are notified', () => {
    const firstCallback = jest.fn();
    const secondCallback = jest.fn();
    const unsubscribeFirst = networkMonitorService.subscribe(firstCallback);
    const unsubscribeSecond = networkMonitorService.subscribe(secondCallback);

    emitNetworkState(offlineState);

    expect(firstCallback).toHaveBeenCalledWith(offlineState);
    expect(secondCallback).toHaveBeenCalledWith(offlineState);
    unsubscribeFirst();
    unsubscribeSecond();
  });

  test('when a subscriber unsubscribes, then it stops receiving changes but the native listener is never removed', () => {
    const callback = jest.fn();
    const unsubscribe = networkMonitorService.subscribe(callback);

    unsubscribe();
    emitNetworkState(offlineState);

    expect(callback).not.toHaveBeenCalled();
    const nativeSubscription = (Network.addNetworkStateListener as jest.Mock).mock.results[0].value;
    expect(nativeSubscription.remove).not.toHaveBeenCalled();
  });

  test('when a new subscriber arrives after a previous one unsubscribed, then it still receives changes through the original native listener', () => {
    const firstCallback = jest.fn();
    networkMonitorService.subscribe(firstCallback)();

    const secondCallback = jest.fn();
    const unsubscribeSecond = networkMonitorService.subscribe(secondCallback);
    emitNetworkState(offlineState);

    expect(secondCallback).toHaveBeenCalledWith(offlineState);
    expect(Network.addNetworkStateListener).toHaveBeenCalledTimes(1);
    unsubscribeSecond();
  });

  test('when one subscriber throws an error, then the remaining subscribers are still notified', () => {
    const failingCallback = jest.fn().mockImplementation(() => {
      throw new Error('boom');
    });
    const healthyCallback = jest.fn();
    const unsubscribeFailing = networkMonitorService.subscribe(failingCallback);
    const unsubscribeHealthy = networkMonitorService.subscribe(healthyCallback);

    emitNetworkState(offlineState);

    expect(healthyCallback).toHaveBeenCalledWith(offlineState);
    unsubscribeFailing();
    unsubscribeHealthy();
  });
});
