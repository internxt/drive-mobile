const DEFAULT_HIGHWATERMARK = 16384;

export function bufferToStream(buf: Buffer, chunkSize: number = DEFAULT_HIGHWATERMARK) {
  // if (typeof buf === 'string') {
  //   buf = Buffer.from(buf, 'utf8');
  // }
  // if (!Buffer.isBuffer(buf)) {
  //   throw new TypeError('"buf" argument must be a string or an instance of Buffer');
  // }

  // const reader = new Readable();
  // const len = buf.length;
  // let start = 0;

  // // Overwrite _read method to push data from buffer.
  // reader._read = function () {
  //   while (reader.push(
  //     buf.slice(start, (start += chunkSize))
  //   )) {
  //     // If all data pushed, just break the loop.
  //     if (start >= len) {
  //       reader.push(null);
  //       break;
  //     }
  //   }
  // };

  return null;

  // return reader;
}
