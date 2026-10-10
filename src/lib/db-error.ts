export function dbError(message: string): string {
  const line = (message || 'Database request failed').split('\n')[0];
  if (line.includes('Insufficient DDO Budget Balance.')) {
    return 'Insufficient DDO Budget Balance.';
  }
  return line.replace(/^(PostgresError|error):\s*/i, '');
}

export function throwIf(error: { message: string } | null) {
  if (error) throw new Error(dbError(error.message));
}
