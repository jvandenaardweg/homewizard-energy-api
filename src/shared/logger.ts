export interface LoggerOptions {
  /** The log method to use. */
  method?: (...args: unknown[]) => void;
  /** The prefix that will show before the log. Defaults to `[HomeWizard Energy API]:` */
  prefix?: string;
}

export const DEFAULT_LOGGER_PREFIX = '[HomeWizard Energy API]:';

/** Logs with the prefix when a log method is set, and does nothing otherwise. */
export function log(options: LoggerOptions | undefined, ...args: unknown[]): void {
  if (!options?.method) return;

  return options.method(options.prefix || DEFAULT_LOGGER_PREFIX, ...args);
}

/** Formats a value for a log line, with every `token` field replaced, so a token never ends up in a log. */
export function redact(value: unknown): string {
  return JSON.stringify(value, (key, field) => (key === 'token' ? '[redacted]' : field));
}
