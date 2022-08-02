import { constants } from '../AppService';
import { io, Socket } from 'socket.io-client';

export class RealtimeUpdates {
  private socket: Socket;

  constructor() {
    const URL = `${constants.REACT_NATIVE_DRIVE_API_URL}`;
    this.socket = io(URL, {
      transports: ['websocket'],
      path: '/api/sockets',
    });
  }

  public init() {
    this.socket.on('connect', () => {
      this.log('Socket connection initialized correctly');
    });

    this.socket.onAny((value) => {
      this.log('RECEIVED THROUGH SOCKET ->', value);
    });
    this.socket.on('error', (event) => {
      this.log('Socket error', event);
    });
    this.socket.connect();
  }

  private log(...messages: unknown[]) {
    // eslint-disable-next-line no-console
    console.log('[REALTIME]:', ...messages);
  }
}
