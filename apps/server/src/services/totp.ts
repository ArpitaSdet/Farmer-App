import crypto from 'crypto';

// Base32 character set (RFC 4648)
const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/**
 * Decodes a Base32 string into a Buffer.
 */
function base32Decode(base32Str: string): Buffer {
  const cleanStr = base32Str.toUpperCase().replace(/=+$/, '');
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];

  for (let i = 0; i < cleanStr.length; i++) {
    const idx = BASE32_ALPHABET.indexOf(cleanStr[i]);
    if (idx === -1) continue;

    value = (value << 5) | idx;
    bits += 5;

    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return Buffer.from(bytes);
}

/**
 * Encodes a buffer into Base32.
 */
function base32Encode(buffer: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = '';

  for (let i = 0; i < buffer.length; i++) {
    value = (value << 8) | buffer[i];
    bits += 8;

    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }

  return output;
}

/**
 * Generates a random Base32 TOTP secret (20 bytes = 160 bits).
 */
export function generateTotpSecret(): string {
  const randomBytes = crypto.randomBytes(20);
  return base32Encode(randomBytes);
}

/**
 * Generates a 6-digit TOTP code for a given secret and counter/time.
 */
export function generateTotpCode(secret: string, timestampMs: number = Date.now(), stepSeconds: number = 30): string {
  const counter = Math.floor(timestampMs / 1000 / stepSeconds);
  const secretBuffer = base32Decode(secret);

  const buffer = Buffer.alloc(8);
  buffer.writeBigInt64BE(BigInt(counter));

  const hmac = crypto.createHmac('sha1', secretBuffer).update(buffer).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code = (hmac.readUInt32BE(offset) & 0x7fffffff) % 1000000;

  return code.toString().padStart(6, '0');
}

/**
 * Verifies a 6-digit TOTP token against a secret with a +/- 1 step window (RFC 6238).
 */
export function verifyTotpToken(
  secret: string,
  token: string,
  timestampMs: number = Date.now(),
  stepSeconds: number = 30,
  window: number = 1
): boolean {
  if (!token || token.length !== 6 || !/^\d{6}$/.test(token)) {
    return false;
  }

  const currentCounter = Math.floor(timestampMs / 1000 / stepSeconds);

  for (let offset = -window; offset <= window; offset++) {
    const counter = currentCounter + offset;
    const secretBuffer = base32Decode(secret);

    const buffer = Buffer.alloc(8);
    buffer.writeBigInt64BE(BigInt(counter));

    const hmac = crypto.createHmac('sha1', secretBuffer).update(buffer).digest();
    const dynamicOffset = hmac[hmac.length - 1] & 0x0f;
    const calculatedCode = ((hmac.readUInt32BE(dynamicOffset) & 0x7fffffff) % 1000000)
      .toString()
      .padStart(6, '0');

    if (calculatedCode === token) {
      return true;
    }
  }

  return false;
}
