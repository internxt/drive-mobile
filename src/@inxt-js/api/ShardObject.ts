import { Shard } from './shard';
import { getBuffer } from '../services/request';

export class ShardObject {
  static download(shard: Shard, cb: (err: Error | null, content: Buffer | null) => void): void {
    getBuffer(shard.url)
      .then((content) => {
        cb(null, content);
      })
      .catch((err) => {
        cb(err, null);
      });
  }
}
