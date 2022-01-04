function computeShardSizeBits(fileSize: number): number {
  // Check if fileSize == 0
  if (fileSize === 0) {
    return 0;
  }

  const MIN_SHARD_SIZE = 2097152; // 2Mb
  const MAX_SHARD_SIZE = 4294967296; // 4 Gb
  const SHARD_MULTIPLES_BACK = 4;

  const shardSize = function (hops: number): number {
    return MIN_SHARD_SIZE * Math.pow(2, hops);
  };

  // Maximum of 2 ^ 41 * 8 * 1024 * 1024
  for (let accumulator = 0; accumulator < 41; accumulator++) {
    let hops = accumulator - SHARD_MULTIPLES_BACK < 0 ? 0 : accumulator - SHARD_MULTIPLES_BACK;
    const byteMultiple = shardSize(accumulator);
    const check = fileSize / byteMultiple;

    if (check > 0 && check <= 1) {
      while (hops > 0 && shardSize(hops) > MAX_SHARD_SIZE) {
        hops = hops - 1 <= 0 ? 0 : hops - 1;
      }

      return shardSize(hops);
    }
  }

  return 0;
}

// Returns the shard size in Bytes
export function computeShardSize(fileSize: number): number {
  const fileSizeBits = fileSize * 8;
  const shardSizeBits = computeShardSizeBits(fileSizeBits);
  // return the number of bytes
  const shardBytes = Math.ceil(shardSizeBits / 8);

  return shardBytes;
}

// Returns the number of shards
export function totalDataShards(fileSize: number): number {
  // Convert to bits
  const fileSizeBits = fileSize * 8;
  const totalShards = Math.ceil(fileSizeBits / computeShardSize(fileSizeBits));

  return totalShards;
}
