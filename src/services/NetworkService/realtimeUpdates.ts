import { constants } from '../AppService';
import { io, Socket } from 'socket.io-client';
import { SdkManager } from '../common';

export class RealtimeUpdates {
  private socket?: Socket;

  constructor(private sdk: SdkManager) {}

  init() {
    this.socket = io(constants.NOTIFICATIONS_URL, {
      auth: {
        token: this.sdk.getApiSecurity().photosToken,
      },
      transports: ['websocket'],
      withCredentials: true,
    });

    this.socket.onAny((data) => {
      this.log('Received data', data);
    });
    this.socket.on('connect', () => {
      this.log('Socket connection initialized correctly');
    });

    this.socket.on('connect_error', (error) => {
      this.log('Socket connect error: ', error.message);
    });

    this.socket.on('error', (event) => {
      this.log('Socket error', event);
    });

    this.socket.on('disconnect', (reason) => {
      this.log('Disconnected from socket ', reason);
    });
    this.socket.connect();
  }

  getSocketId() {
    return this.socket?.id;
  }

  onEvent(callback: (data: any) => void) {
    this.socket?.on('event', (data) => {
      this.log('Received data: ', JSON.stringify(data, null, 2));

      callback(data);
    });
  }

  private log(...messages: unknown[]) {
    if (!__DEV__) return;
    // eslint-disable-next-line no-console
    console.log('[REALTIME]:', ...messages);
  }
}

export const realtime = new RealtimeUpdates(SdkManager.getInstance());
