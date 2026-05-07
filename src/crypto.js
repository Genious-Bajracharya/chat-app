// E2E encryption using browser's built-in Web Crypto API — no npm packages needed.
// Key exchange: ECDH P-256  |  Encryption: AES-GCM 256-bit

const ENC_PREFIX = 'ENC:';

function toBase64(buffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)));
}

function fromBase64(b64) {
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

// Generate an ECDH keypair, export as base64 strings for storage/transfer
export async function generateKeyPair() {
  const kp = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveKey']
  );
  const publicKeyRaw = await crypto.subtle.exportKey('raw', kp.publicKey);
  const privateKeyJwk = await crypto.subtle.exportKey('jwk', kp.privateKey);
  return {
    publicKey: toBase64(publicKeyRaw),
    secretKey: JSON.stringify(privateKeyJwk)
  };
}

// Get or create keypair for this user from localStorage
export async function getOrCreateKeyPair(userId) {
  const storageKey = `chatapp_keypair_${userId}`;
  const stored = localStorage.getItem(storageKey);
  if (stored) return JSON.parse(stored);
  const kp = await generateKeyPair();
  localStorage.setItem(storageKey, JSON.stringify(kp));
  return kp;
}

export function getStoredKeyPair(userId) {
  const stored = localStorage.getItem(`chatapp_keypair_${userId}`);
  return stored ? JSON.parse(stored) : null;
}

// Import a raw base64 public key for ECDH
async function importPublicKey(b64) {
  return crypto.subtle.importKey(
    'raw',
    fromBase64(b64),
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  );
}

// Import a JWK private key
async function importPrivateKey(jwkStr) {
  return crypto.subtle.importKey(
    'jwk',
    JSON.parse(jwkStr),
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    ['deriveKey']
  );
}

// Derive AES-GCM shared key from ECDH
async function deriveSharedKey(myPrivateKey, theirPublicKey) {
  return crypto.subtle.deriveKey(
    { name: 'ECDH', public: theirPublicKey },
    myPrivateKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

// Encrypt a plaintext message for a recipient
// Returns: "ENC:<base64(iv + ciphertext)>"
export async function encryptMessage(plaintext, recipientPublicKeyB64, mySecretKeyJwk) {
  const recipientPubKey = await importPublicKey(recipientPublicKeyB64);
  const myPrivKey = await importPrivateKey(mySecretKeyJwk);
  const sharedKey = await deriveSharedKey(myPrivKey, recipientPubKey);

  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    sharedKey,
    new TextEncoder().encode(plaintext)
  );

  const combined = new Uint8Array(iv.byteLength + encrypted.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(encrypted), iv.byteLength);

  return ENC_PREFIX + toBase64(combined);
}

// Decrypt a message we received (or sent, using same shared key)
export async function decryptMessage(encryptedContent, theirPublicKeyB64, mySecretKeyJwk) {
  if (!encryptedContent?.startsWith(ENC_PREFIX)) return encryptedContent;

  try {
    const theirPubKey = await importPublicKey(theirPublicKeyB64);
    const myPrivKey = await importPrivateKey(mySecretKeyJwk);
    const sharedKey = await deriveSharedKey(myPrivKey, theirPubKey);

    const combined = fromBase64(encryptedContent.slice(ENC_PREFIX.length));
    const iv = combined.slice(0, 12);
    const ciphertext = combined.slice(12);

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      sharedKey,
      ciphertext
    );
    return new TextDecoder().decode(decrypted);
  } catch {
    return '[encrypted message]';
  }
}

export const isEncrypted = (content) => content?.startsWith(ENC_PREFIX);
