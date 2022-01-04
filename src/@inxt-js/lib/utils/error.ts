export class WrappedError extends Error {
  header = '';

  constructor(message: string) {
    super(message);
  }
}

export const wrap = (header: string, err: Error): WrappedError => {
  const wrappedError = new WrappedError(header + ': ' + err.message);

  wrappedError.stack = err.stack;
  wrappedError.name = err.name;
  wrappedError.header = header;

  return wrappedError;
};
