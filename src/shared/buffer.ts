// oxlint-disable-next-line typescript/no-explicit-any
export function bufferArrayToJSON<T extends Record<string, any>>(buffers: Buffer[]): T {
  return buffers.reduce(
    (prev, buffer) => {
      const entry = buffer.toString();
      const separatorIndex = entry.indexOf('=');

      // A TXT entry is "key=value"; only the first "=" separates them, the value may contain more
      const key = separatorIndex === -1 ? entry : entry.slice(0, separatorIndex);
      const value = separatorIndex === -1 ? undefined : entry.slice(separatorIndex + 1);

      // Skip entries without a key, and "__proto__" so a TXT record can't set the object's prototype
      if (!key || key === '__proto__') return prev;

      prev[key] = value;

      return prev;
    },
    {} as Record<string, unknown>,
  ) as T;
}

export function isBufferArray(value: unknown): value is Buffer[] {
  if (!Array.isArray(value)) return false;

  return value.every(v => Buffer.isBuffer(v));
}
