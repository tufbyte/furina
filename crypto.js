/* ===============================
   crypto.js - Encryption Helpers
   =============================== */

/*
  Requirements:
  - AES-GCM encryption per-message
  - Per-message random salt & IV
  - PBKDF2 derivation of key from paraphrase
  - Returns/accepts base64-encoded envelope JSON
*/

const PBKDF2_ITERS = 250000; // adjust for CPU/strength
const SALT_BYTES = 16;
const IV_BYTES = 12; // AES-GCM standard

// Helpers for ArrayBuffer <-> base64
function ab2b64(buf) {
  const bytes = new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function b642ab(str) {
  const binary = atob(str);
  const buf = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) buf[i] = binary.charCodeAt(i);
  return buf.buffer;
}

// Derive AES-GCM key from paraphrase + salt
async function deriveKeyWithSalt(paraphrase, saltBytes) {
  const enc = new TextEncoder();
  const baseKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(paraphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: saltBytes,
      iterations: PBKDF2_ITERS,
      hash: 'SHA-256'
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

// Encrypt plaintext -> base64 envelope
async function encryptMessageEnvelope(plaintext, paraphrase, sender=null) {
  const enc = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));

  const key = await deriveKeyWithSalt(paraphrase, salt.buffer);
  const ctBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    enc.encode(plaintext)
  );

  const envelope = {
    v: 1,
    salt: ab2b64(salt.buffer),
    iv: ab2b64(iv.buffer),
    ct: ab2b64(ctBuffer),
    ts: new Date().toISOString()
  };

  if (sender) envelope.sender = String(sender);

  return btoa(JSON.stringify(envelope));
}

// Decrypt base64 envelope -> plaintext
async function decryptMessageEnvelope(b64Envelope, paraphrase) {
  try {
    const json = atob(b64Envelope);
    const env = JSON.parse(json);

    if (!env || !env.salt || !env.iv || !env.ct) return null;

    const saltBuf = b642ab(env.salt);
    const ivBuf = b642ab(env.iv);
    const ctBuf = b642ab(env.ct);

    const key = await deriveKeyWithSalt(paraphrase, saltBuf);
    const plainBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: new Uint8Array(ivBuf) },
      key,
      ctBuf
    );

    return {
      text: new TextDecoder().decode(plainBuffer),
      meta: {
        ts: env.ts || null,
        sender: env.sender || null,
        version: env.v || 0
      }
    };
  } catch (err) {
    // Wrong paraphrase or corrupted data
    return null;
  }
}
