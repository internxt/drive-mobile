// axios 1.x auto-detects fetch and uses it as adapter, but expo/virtual/streams
// has a broken ReadableStream.cancel in the Jest environment. Remove fetch so
// axios falls back to the http adapter before any module loads it.
delete (global as any).fetch;
delete (global as any).ReadableStream;
