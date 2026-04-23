/**
 * CryptoUtils.js 
 * Handles RSA-OAEP Key Management, AES-GCM Encryption, and IndexedDB Persistence.
 */

const DB_NAME = "KeyStorage";
const STORE_NAME = "PrivateKeys";
const KEY_ALIAS = "user-main-private-key";

const CryptoUtils = {

  // --- 1. UTILITIES --- 

  base64ToArrayBuffer(base64) {
    const binaryString = window.atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  },

  // --- 2. KEY DERIVATION (PBKDF2) ---

  /**
   * Turns a password into a 256-bit AES key.
   * iterations: 100,000 is a standard for security/performance balance.
   */
  async deriveEncryptionKey(password, salt) {
    const encoder = new TextEncoder();
    const baseKey = await crypto.subtle.importKey(
      "raw",
      encoder.encode(password),
      "PBKDF2",
      false,
      ["deriveKey"]
    );

    return await crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: salt,
        iterations: 100000,
        hash: "SHA-256",
      },
      baseKey,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"]
    );
  },

  // --- 3. ENCRYPTION (For First-Time Setup) ---

  /**
   * Encrypts a Private Key so it can be safely stored in the database.
   */
  async encryptPrivateKey(privateKey, password) {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12)); // GCM standard IV

    const aesKey = await this.deriveEncryptionKey(password, salt);

    // Export the private key to a raw format (PKCS#8) before encrypting
    const exportedRawKey = await crypto.subtle.exportKey("pkcs8", privateKey);

    const encrypted = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: iv },
      aesKey,
      exportedRawKey
    );

    return { encrypted, salt, iv };
  },

  // --- 4. RECOVERY (For New Devices) ---

  /**
   * Unlocks the encrypted key from the DB using the password.
   */
  async getPrivateKeyFromBackup(dbEntry, userPassword) {
    try {
      // 1. Helper to extract the data array and convert to Uint8Array
      const toUint8 = (field) => {
        if (field && field.data && Array.isArray(field.data)) {
          return new Uint8Array(field.data);
        }
        // Fallback in case it's already a base64 string
        if (typeof field === 'string') {
          return new Uint8Array(this.base64ToArrayBuffer(field));
        }
        return field;
      };

      // 2. Extract the actual bytes from the 'data' array
      const encryptedBuffer = toUint8(dbEntry.encryptedPrivateKey);
      const saltBuffer = toUint8(dbEntry.salt);
      const ivBuffer = toUint8(dbEntry.iv);

      // 3. Proceed with decryption using the extracted bytes
      const aesKey = await this.deriveEncryptionKey(userPassword, saltBuffer);

      const decryptedRawKey = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: ivBuffer },
        aesKey,
        encryptedBuffer
      );

      // 4. Final import
      return await crypto.subtle.importKey(
        "pkcs8",
        decryptedRawKey,
        { name: "RSA-OAEP", hash: "SHA-256" },
        true,
        ["decrypt"]
      );

    } catch (error) {
      console.error("Decryption failed internally:", error);
      // If it fails here, it's either a bad password or corrupted bytes
      throw new Error("Failed to unlock keys. Please check your password.");
    }
  },

  // --- 5. INDEXED-DB (Local Device Storage) ---

  _openDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(STORE_NAME)) {
          request.result.createObjectStore(STORE_NAME);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  async saveKeyLocally(privateKey) {
    const db = await this._openDB();
    const transaction = db.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).put(privateKey, KEY_ALIAS);
  },

  async loadKeyLocally() { 
    try {
      const db = await this._openDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, "readonly");
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(KEY_ALIAS);
        request.onsuccess = () => {
          // request.result will be the CryptoKey object or undefined if not found
          resolve(request.result || null);
        };
        request.onerror = () => {
          console.error("IndexedDB Get Error:", request.error);
          resolve(null);
        };
        // Handle cases where the transaction itself fails
        transaction.onabort = () => resolve(null);
      });
    } catch (err) {
      console.error("Failed to open DB for loading:", err);
      return null;
    }
  }, 
 async decryptMessage(data, privateKey, currentUserId) {
  if(!data||!privateKey||!currentUserId) return
  try {
    // 🔥 Convert string to object if needed
    const payload =
      typeof data.content === "string"
        ? JSON.parse(data.content)
        : data.content;

    const isMe =
      data.senderId === currentUserId ||
      data.senderId?._id === currentUserId;
    const encryptedKeyBase64 = isMe
      ? payload.keyForSender
      : payload.keyForReceiver;

    if (!encryptedKeyBase64) {
    
      return "[Invalid message]";
    }

    const rawAesKey = await crypto.subtle.decrypt(
      { name: "RSA-OAEP" },
      privateKey,
      this.base64ToArrayBuffer(encryptedKeyBase64)
    );

    const aesKey = await crypto.subtle.importKey(
      "raw",
      rawAesKey, 
      "AES-GCM",
      false,
      ["decrypt"]
    );

    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: this.base64ToArrayBuffer(payload.iv) },
      aesKey,
      this.base64ToArrayBuffer(payload.ciphertext)
    );

    return new TextDecoder().decode(decrypted);

  } catch (error) {
    console.error("Decryption failed:", error);
    return "[Unable to decrypt]";
  }
}
};

// utils/CryptoUtils.js

// 🔹 Base64 helpers
const base64ToArrayBuffer = (base64) => {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes.buffer;
};

const arrayBufferToBase64 = (buffer) => {
  const bytes = new Uint8Array(buffer);
  let binary = "";

  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }

  return btoa(binary);
};


// 🔐 1️⃣ Decrypt Group Key
export const decryptGroupKey = async (conversation, privateKeyObj) => {
  if (!conversation.encryptedGroupKey) {
    throw new Error("No encrypted group key found");
  }

  const encryptedKeyBuffer = base64ToArrayBuffer(
    conversation.encryptedGroupKey
  );

  let privateKey;

  // Handle CryptoKey vs stored buffer
  if (privateKeyObj instanceof CryptoKey) {
    privateKey = privateKeyObj;
  } else {
    const privateKeyBuffer = new Uint8Array(privateKeyObj.data);

    privateKey = await crypto.subtle.importKey(
      "pkcs8",
      privateKeyBuffer,
      {
        name: "RSA-OAEP",
        hash: "SHA-256",
      },
      true,
      ["decrypt"]
    );
  }

  // 🔐 Decrypt AES group key
  const decryptedGroupKeyBuffer = await crypto.subtle.decrypt(
    { name: "RSA-OAEP" },
    privateKey,
    encryptedKeyBuffer
  );

  // 🔐 Convert to usable AES key
  return crypto.subtle.importKey(
    "raw",
    decryptedGroupKeyBuffer,
    { name: "AES-GCM" },
    true,
    ["encrypt", "decrypt"]
  );
};
// 🔐 2️⃣ Encrypt Message
export const encryptGroupMessage = async (message, groupKey) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const iv = crypto.getRandomValues(new Uint8Array(12)); // 12 bytes IV
  const encrypted = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv,
    },
    groupKey,
    data
  );
  return {
    ciphertext: arrayBufferToBase64(encrypted),
    iv: arrayBufferToBase64(iv),
  };
};
// 🔐 3️⃣ Decrypt Message
export const decryptGroupMessage = async (encryptedPayload, groupKey) => {
  
  try {
    const { ciphertext, iv } = encryptedPayload;
    const encryptedBuffer = base64ToArrayBuffer(ciphertext);
    const ivBuffer = new Uint8Array(base64ToArrayBuffer(iv));
    const decrypted = await crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: ivBuffer,
      },
      groupKey,
      encryptedBuffer
    );

    const decoder = new TextDecoder();
    return decoder.decode(decrypted);

  } catch (err) {
    console.error("Decryption failed:", err);
    return "⚠️ Unable to decrypt message";
  }
};
export default CryptoUtils;