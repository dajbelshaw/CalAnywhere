import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12; // 96-bit IV recommended for GCM
const KEY_ENV = 'EMAIL_ENCRYPTION_KEY';

/**
 * Returns the 32-byte encryption key from the environment.
 * Throws if not set or invalid length.
 */
function getKey(): Buffer {
  const hex = process.env[KEY_ENV];
  if (!hex) {
    throw new Error(`${KEY_ENV} environment variable is not set`);
  }
  const key = Buffer.from(hex, 'hex');
  if (key.length !== 32) {
    throw new Error(`${KEY_ENV} must be a 64-character hex string (32 bytes)`);
  }
  return key;
}

export interface EncryptedValue {
  ciphertext: string; // hex-encoded
  iv: string;         // hex-encoded
  tag: string;        // hex-encoded
}

/**
 * Encrypts a plaintext string with AES-256-GCM.
 * Returns the ciphertext, IV, and auth tag (all hex-encoded).
 */
export function encrypt(plaintext: string): EncryptedValue {
  const key = getKey();
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag();

  return {
    ciphertext: encrypted,
    iv: iv.toString('hex'),
    tag: tag.toString('hex'),
  };
}

/**
 * Decrypts a value previously encrypted with encrypt().
 * Returns the original plaintext string.
 */
export function decrypt(encrypted: EncryptedValue): string {
  const key = getKey();
  const decipher = createDecipheriv(
    ALGORITHM,
    key,
    Buffer.from(encrypted.iv, 'hex')
  );
  decipher.setAuthTag(Buffer.from(encrypted.tag, 'hex'));

  let decrypted = decipher.update(encrypted.ciphertext, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
