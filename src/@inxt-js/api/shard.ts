import { EnvironmentConfig } from '..';

export interface Shard {
  index: number;
  replaceCount: number;
  hash: string;
  size: number;
  parity: boolean;
  token: string;
  healthy?: boolean;
  farmer: {
    userAgent: string;
    protocol: string;
    address: string;
    port: number;
    nodeID: string;
    lastSeen: Date;
  };
  operation: string;
  url: string
}

export function DownloadShardRequest(
  config: EnvironmentConfig,
  address: string,
  port: number,
  hash: string,
  token: string,
  nodeID: string,
): void {
  const fetchUrl = `http://${address}:${port}/shards/${hash}?token=${token}`;
}

export async function DownloadShard(
  config: EnvironmentConfig,
  shard: Shard,
  bucketId: string,
  fileId: string,
  excludedNodes: string[] = [],
): Promise<any> {
  return null;
}
