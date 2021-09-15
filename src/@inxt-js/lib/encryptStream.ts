import { createCipheriv, Cipher } from 'react-native-crypto';

interface RawShard {
  size: number;
  index: number;
}

type ErrorEvent = 'error';
type ErrorListener = (err: Error) => void;
type onErrorListener = (event: ErrorEvent, listener: ErrorListener) => void;

type DataEvent = 'data';
type DataListener = (chunk: Buffer) => void;
type onDataListener = (event: DataEvent, listener: DataListener) => void;

type EndEvent = 'end';
type EndListener = (err?: Error) => void;
type onEndListener = (event: EndEvent, listener: EndListener) => void;

type StreamEvent = ErrorEvent | DataEvent | EndEvent;
type StreamListener = ErrorListener & DataListener & EndListener;
type onListener = onDataListener & onEndListener & onErrorListener;

export class EncryptStream {
  private cipher: Cipher;
  private indexCounter = 0;
  private listeners: Map<StreamEvent, StreamListener[]> = new Map<StreamEvent, StreamListener[]>();

  public shards: RawShard [] = [];

  constructor(key: Buffer, iv: Buffer) {
    this.cipher = createCipheriv('aes-256-ctr', key, iv);

    this.listeners.set('end', []);
    this.listeners.set('data', []);
    this.listeners.set('error', []);
  }

  on: onListener = (event, listener) => {
    this.listeners.get(event).push(listener);
  }

  emit(event: StreamEvent, content?: any): void {
    this.listeners.get(event).forEach((listener) => listener(content));
  }

  push(chunk: Buffer): void {
    if (!chunk) {
      return this.end();
    }

    this.cipher.write(chunk);

    this.shards.push({ size: chunk.byteLength, index: this.indexCounter });
    this.indexCounter++;

    this.emit('data', this.cipher.read());
  }

  end(): void {
    const lastChunk = this.cipher.read();

    if (lastChunk) {
      this.emit('data', lastChunk);
    }
    this.emit('end');
  }
}

export default EncryptStream;
