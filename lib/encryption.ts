
/**
 * Encryption utilities for the Logbook
 * Uses Web Crypto API for client-side encryption
 */

/**
 * Hashes a key (passphrase) to store in the DB for verification.
 * We use SHA-256 for the hash.
 */
export async function hashKey(key: string): Promise<string> {
    const encoder = new TextEncoder()
    const data = encoder.encode(key)
    const hashBuffer = await crypto.subtle.digest("SHA-256", data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("")
}

/**
 * Derives a crypto key from a password string
 */
async function deriveKey(password: string, salt: Uint8Array) {
    const encoder = new TextEncoder()
    const passwordData = encoder.encode(password)

    const baseKey = await crypto.subtle.importKey(
        "raw",
        passwordData,
        "PBKDF2",
        false,
        ["deriveKey"]
    )

    return crypto.subtle.deriveKey(
        {
            name: "PBKDF2",
            salt: salt,
            iterations: 100000,
            hash: "SHA-256",
        } as Pbkdf2Params,
        baseKey,
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt", "decrypt"]
    )

}

/**
 * Encrypts a string using a passphrase
 */
export async function encryptMessage(message: string, key: string): Promise<string> {
    const encoder = new TextEncoder()
    const data = encoder.encode(message)
    const salt = crypto.getRandomValues(new Uint8Array(16))
    const iv = crypto.getRandomValues(new Uint8Array(12))

    const cryptoKey = await deriveKey(key, salt)

    const encrypted = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv: iv },
        cryptoKey,
        data
    )

    // Combine salt + iv + encrypted data into a single base64 string
    const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength)
    combined.set(salt)
    combined.set(iv, salt.length)
    combined.set(new Uint8Array(encrypted), salt.length + iv.length)

    return btoa(String.fromCharCode(...combined))
}

/**
 * Decrypts a string using a passphrase
 */
export async function decryptMessage(encryptedBase64: string, key: string): Promise<string> {
    try {
        const combined = new Uint8Array(
            atob(encryptedBase64)
                .split("")
                .map((c) => c.charCodeAt(0))
        )

        const salt = combined.slice(0, 16)
        const iv = combined.slice(16, 28)
        const data = combined.slice(28)

        const cryptoKey = await deriveKey(key, salt)

        const decrypted = await crypto.subtle.decrypt(
            { name: "AES-GCM", iv: iv },
            cryptoKey,
            data
        )

        return new TextDecoder().decode(decrypted)
    } catch (error) {
        console.error("Decryption failed:", error)
        throw new Error("Invalid decryption key or corrupted data")
    }
}
