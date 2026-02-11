/**
 * Encryption utilities for the Logbook.
 * Uses Web Crypto API: PBKDF2 400k for derivation and verification; AES-256-GCM for payloads.
 * Verification = SHA-256(PBKDF2(key, salt, 400k)); no key material stored.
 */

export const PBKDF2_ITERATIONS = 400_000;

export const ENCRYPTION_VERSION_CURRENT = 1;

const VERSION_BYTE = 0x01;
const SALT_LEN = 16;
const IV_LEN = 12;
const VERIFICATION_DERIVED_LEN = 32;

function encodeBase64(bytes: Uint8Array): string {
  return btoa(Array.from(bytes).map((b) => String.fromCharCode(b)).join(""));
}

function decodeBase64(str: string): Uint8Array {
  return Uint8Array.from(atob(str), (c) => c.charCodeAt(0));
}

function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

const LEGACY_ITERATIONS = 100_000;

async function deriveKey(
  password: string,
  salt: Uint8Array,
  iterations: number = PBKDF2_ITERATIONS
): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const passwordData = encoder.encode(password);
  const baseKey = await crypto.subtle.importKey(
    "raw",
    passwordData,
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations,
      hash: "SHA-256",
    } as Pbkdf2Params,
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

async function deriveVerificationBits(
  key: string,
  salt: Uint8Array
): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const baseKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(key),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  return crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    } as Pbkdf2Params,
    baseKey,
    VERIFICATION_DERIVED_LEN * 8
  );
}

function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Generates a per-user verification hash: PBKDF2(key, salt, 400k) -> 32 bytes, then SHA-256 -> hex.
 * Store salt and hash in profile; never store raw key or derived key.
 */
export async function generateKeyHash(
  key: string
): Promise<{ saltBase64: string; hash: string }> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LEN));
  const derived = await deriveVerificationBits(key, salt);
  const hashBuffer = await crypto.subtle.digest("SHA-256", derived);
  return {
    saltBase64: encodeBase64(salt),
    hash: bufferToHex(hashBuffer),
  };
}

/**
 * Verifies key against stored salt + hash. Uses constant-time comparison.
 */
export async function verifyKey(
  key: string,
  saltBase64: string,
  storedHash: string
): Promise<boolean> {
  const salt = decodeBase64(saltBase64);
  const derived = await deriveVerificationBits(key, salt);
  const hashBuffer = await crypto.subtle.digest("SHA-256", derived);
  const computedHash = bufferToHex(hashBuffer);
  return constantTimeCompare(computedHash, storedHash);
}

/**
 * Legacy: raw SHA-256 of key (hex). Used only to verify pre-migration users; then migrate to salted PBKDF2.
 */
export async function legacyHashKey(key: string): Promise<string> {
  const data = new TextEncoder().encode(key);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return bufferToHex(hashBuffer);
}

/**
 * Verifies key against legacy (SHA-256-only) stored hash. Constant-time. Use only for migration path.
 */
export async function verifyLegacyKey(
  key: string,
  storedHash: string
): Promise<boolean> {
  const computed = await legacyHashKey(key);
  return constantTimeCompare(computed, storedHash);
}

/**
 * Encrypts a string. Format: [1 byte version][16 salt][12 iv][ciphertext], base64.
 */
export async function encryptMessage(
  message: string,
  key: string
): Promise<string> {
  const data = new TextEncoder().encode(message);
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LEN));
  const iv = crypto.getRandomValues(new Uint8Array(IV_LEN));
  const cryptoKey = await deriveKey(key, salt);
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    cryptoKey,
    data
  );
  const enc = new Uint8Array(encrypted);
  const combined = new Uint8Array(1 + SALT_LEN + IV_LEN + enc.length);
  combined[0] = VERSION_BYTE;
  combined.set(salt, 1);
  combined.set(iv, 1 + SALT_LEN);
  combined.set(enc, 1 + SALT_LEN + IV_LEN);
  return encodeBase64(combined);
}

/**
 * Decrypts a string. Supports versioned format [0x01][salt][iv][ct] and legacy [salt][iv][ct].
 * When dbVersion is provided, uses it to choose format (1 = current, 0/null = legacy); otherwise detects from payload.
 */
export async function decryptMessage(
  encryptedBase64: string,
  key: string,
  dbVersion?: number | null
): Promise<string> {
  try {
    const combined = decodeBase64(encryptedBase64);
    let salt: Uint8Array, iv: Uint8Array, data: Uint8Array, useLegacy = false;
    const forceVersioned = dbVersion === ENCRYPTION_VERSION_CURRENT;
    const forceLegacy = dbVersion !== undefined && dbVersion !== null && dbVersion !== ENCRYPTION_VERSION_CURRENT;

    if (forceLegacy) {
      if (combined.length < SALT_LEN + IV_LEN + 1) throw new Error("Invalid decryption key or corrupted data");
      salt = combined.slice(0, SALT_LEN);
      iv = combined.slice(SALT_LEN, SALT_LEN + IV_LEN);
      data = combined.slice(SALT_LEN + IV_LEN);
      useLegacy = true;
    } else if (
      forceVersioned ||
      (combined.length >= 1 + SALT_LEN + IV_LEN + 1 && combined[0] === VERSION_BYTE)
    ) {
      if (!forceVersioned && combined[0] !== VERSION_BYTE) throw new Error("Invalid decryption key or corrupted data");
      salt = combined.slice(1, 1 + SALT_LEN);
      iv = combined.slice(1 + SALT_LEN, 1 + SALT_LEN + IV_LEN);
      data = combined.slice(1 + SALT_LEN + IV_LEN);
    } else if (combined.length >= SALT_LEN + IV_LEN + 1) {
      salt = combined.slice(0, SALT_LEN);
      iv = combined.slice(SALT_LEN, SALT_LEN + IV_LEN);
      data = combined.slice(SALT_LEN + IV_LEN);
      useLegacy = true;
    } else {
      throw new Error("Invalid decryption key or corrupted data");
    }
    const cryptoKey = await deriveKey(
      key,
      salt,
      useLegacy ? LEGACY_ITERATIONS : PBKDF2_ITERATIONS
    );
    const ivBuf = new ArrayBuffer(iv.length);
    new Uint8Array(ivBuf).set(iv);
    const dataBuf = new ArrayBuffer(data.length);
    new Uint8Array(dataBuf).set(data);
    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: ivBuf },
      cryptoKey,
      dataBuf
    );
    return new TextDecoder().decode(decrypted);
  } catch {
    throw new Error("Invalid decryption key or corrupted data");
  }
}
