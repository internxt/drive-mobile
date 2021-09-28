import { AxiosError } from 'axios';
import { EventEmitter } from '../lib/utils/eventEmitter';

import { INXTRequest } from '../lib';
import { ContractNegotiated } from '../lib/contracts';
import { ShardMeta } from '../lib/shardMeta';
import { wrap } from '../lib/utils/error';
import { logger } from '../lib/utils/logger';
import { InxtApiI, SendShardToNodeResponse } from '../services/api';
import { Shard } from './shard';

export class ShardObject extends EventEmitter {
  private meta: ShardMeta;
  private api: InxtApiI;
  private frameId: string;
  private requests: INXTRequest[] = [];
  private shard?: Shard;

  static Events = {
    NodeTransferFinished: 'node-transfer-finished'
  };

  constructor(api: InxtApiI, frameId: string | null, meta: ShardMeta | null, shard?: Shard) {
    super();

    // TODO: Clarify if meta and shard variables are both required.
    this.frameId = frameId ?? '';
    this.meta = meta ?? {
      hash: '',
      index: 0,
      parity: false,
      challenges_as_str: [],
      size: 0,
      tree: [],
      challenges: [],
      exclude: []
    };
    this.api = api;
    this.shard = shard;
  }

  getSize(): number {
    return this.meta.size;
  }

  getHash(): string {
    return this.meta.hash;
  }

  getIndex(): number {
    return this.meta.index;
  }

  async upload(content: Buffer): Promise<ShardMeta> {
    if (!this.frameId) {
      throw new Error('Frame id not provided');
    }

    const contract = await this.negotiateContract();

    logger.debug(`Negotiated succesfully contract for shard ${this.getHash()} (index ${this.getIndex()}, size ${this.getSize()}) with token ${contract.token}`);

    const farmer = { ...contract.farmer, lastSeen: new Date() };
    const shard: Shard = {
      index: this.getIndex(),
      replaceCount: 0,
      hash: this.getHash(),
      size: this.getSize(),
      parity: this.meta.parity,
      token: contract.token,
      farmer,
      operation: contract.operation
    };

    await this.put(shard, content);

    return this.meta;
  }

  private negotiateContract(): Promise<ContractNegotiated> {
    const req = this.api.addShardToFrame(this.frameId, this.meta);

    this.requests.push(req);

    return req.start<ContractNegotiated>()
      .catch((err) => {
        throw wrap('Contract negotiation error', err);
      });
  }

  private put(shard: Shard, content: Buffer): Promise<any> {
    let success = true;

    return this.api.requestPut(shard).start<{ result: string }>().then((res) => {
      const putUrl = res.result;

      logger.debug(`Put url for shard ${shard.index} is ${putUrl}`);

      return this.api.putShard(putUrl, content).start();
    }).catch((err: AxiosError) => {
      logger.error(`Error uploading shard ${shard.index}: ${err.message}`);

      if (err.response && err.response.status < 400) {
        return { result: err.response.data && err.response.data.error };
      }

      success = false;

      throw wrap('Farmer request error', err);
    }).finally(() => {
      const hash = shard.hash;
      const nodeID = shard.farmer.nodeID;

      this.emit(ShardObject.Events.NodeTransferFinished, [{ hash, nodeID, success }]);
    });
  }

  private sendShardToNode(content: Buffer, shard: Shard): Promise<SendShardToNodeResponse> {
    const req = this.api.sendShardToNode(shard, content);

    this.requests.push(req);

    let success = true;

    return req.start<SendShardToNodeResponse>()
      .catch((err: AxiosError) => {
        if (err.response && err.response.status < 400) {
          return { result: err.response.data && err.response.data.error };
        }

        success = false;

        throw wrap('Farmer request error', err);
      }).finally(() => {
        const hash = shard.hash;
        const nodeID = shard.farmer.nodeID;

        this.emit(ShardObject.Events.NodeTransferFinished, [{ hash, nodeID, success }]);
      });
  }

  abort(): void {
    this.requests.forEach((r) => {
      r.abort();
    });
  }

  download(): Promise<Buffer> {
    if (!this.shard) {
      throw new Error('Provide shard info before trying to download a shard');
    }

    const req = this.api.getShardFromNode(this.shard);

    this.requests.push(req);

    return req.buffer();
  }
}
