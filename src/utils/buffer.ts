// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const bufferArrayToJSON = <T extends Record<string, any>>(buffers: Buffer[]): T => {
  return buffers.reduce((prev, buffer) => {
    const [key, value] = buffer.toString().split('=');

    prev[key] = value;

    return prev;
  }, {} as Record<string, unknown>) as T;
};
