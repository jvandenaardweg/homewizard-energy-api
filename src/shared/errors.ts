/** Formats an error, or anything else that was thrown, for a log line. */
export function formatError(error: unknown): string {
  if (error instanceof Error) return `${error.name}: ${error.message}`;

  try {
    return JSON.stringify(error);
  } catch {
    // For example a circular object, which JSON can't represent
    return String(error);
  }
}
