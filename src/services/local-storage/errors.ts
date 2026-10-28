export type StorageErrorCode = 'unavailable' | 'quota' | 'unknown';

export class StorageError extends Error {
  readonly code: StorageErrorCode;
  constructor(code: StorageErrorCode, cause?: unknown) {
    super(`Local storage error: ${code}`);
    this.name = 'StorageError';
    this.code = code;
    this.cause = cause;
  }
}

export function toStorageError(e: unknown): StorageError {
  if (e instanceof StorageError) return e;
  const name = (e as { name?: string } | null)?.name ?? '';
  const inner = (e as { inner?: { name?: string } } | null)?.inner?.name ?? '';
  const names = `${name} ${inner}`;
  if (/QuotaExceeded/i.test(names)) return new StorageError('quota', e);
  if (/(OpenFailed|DatabaseClosed|Security|InvalidState|MissingAPI|UnknownError|VersionError)/i.test(names)) {
    return new StorageError('unavailable', e);
  }
  return new StorageError('unknown', e);
}
