import crypto from 'crypto';

/**
 * Generate a 64-character hex SHA-256 hash of the given string.
 */
export function hashKey(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}