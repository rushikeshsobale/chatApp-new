/**
 * CryptoUtils.js 
 * Consolidated Cryptographic Utility Engine for HiBuddy.
 * Handles Asymmetric RSA-OAEP Keypairs, Ephemeral Symmetric AES-GCM Session Streams, 
 * Group Conversions, and Secure Browser-Level IndexedDB Ledger Management.
 */

const DB_NAME = "KeyStorage";
const STORE_NAME = "PrivateKeys";
const KEY_ALIAS = "user-main-private-key";

const CryptoUtils = {

  // ==========================================
  // 1. DATA CONVERSION TRANSFORMS
  // ==========================================

  base64ToArrayBuffer(base64) {
    const binaryString = window.atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  },

  arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  },

  // ==========================================
  // 2. ASYMMETRIC INITIALIZATION UTILITIES
  // ==========================================

  /**
   * Generates a pristine RSA-OAEP 2048-bit Asymmetric Cryptographic Keypair.
   * Private key stays local to the device; Public key gets published to MongoDB.
   */
  async generateSessionKeyPair() {
    return await window.crypto.subtle.generateKey(
      {
        name: "RSA-OAEP",
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]), // 65537 standard
        hash: "SHA-256",
      },
      true, // Must stay exportable to back it up into IndexedDB / transfer public keys
      ["encrypt", "decrypt"]
    );
  },

  /**
   * Transforms a native CryptoKey object into a portable string format for network transport.
   */
  async exportPublicKeyString(publicKey) {
    const exported = await window.crypto.subtle.exportKey("spki", publicKey);
    return this.arrayBufferToBase64(exported);
  },

  /**
   * Restores a base64 string representation back into a usable Web Crypto Public Key Instance.
   */
  async importPublicKeyString(base64String) {
    const buffer = this.base64ToArrayBuffer(base64String);
    return await window.crypto.subtle.importKey(
      "spki",
      buffer,
      { name: "RSA-OAEP", hash: "SHA-256" },
      true,
      ["encrypt"]
    );
  },

  // ==========================================
  // 3. INDEXED-DB PERSISTENCE (Local Vault)
  // ==========================================

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

 // In CryptoUtils.js, update saveKeyLocally:
async saveKeyLocally(privateKey) {
  const db = await this._openDB();
  const transaction = db.transaction(STORE_NAME, "readwrite");
  const store = transaction.objectStore(STORE_NAME);
  
  // Important: IndexedDB can store CryptoKey objects directly in most modern browsers!
  store.put(privateKey, KEY_ALIAS);
},

  async loadKeyLocally() { 
    try {
      const db = await this._openDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, "readonly");
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(KEY_ALIAS);
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => {
          console.error("IndexedDB Key Retrieval Fault:", request.error);
          resolve(null);
        };
        transaction.onabort = () => resolve(null);
      });
    } catch (err) {
      console.error("Failed to open DB for loading:", err);
      return null;
    }
  }, 

  // ==========================================
  // 4. HYBRID 1-ON-1 CRYPTOGRAPHIC ENGINE
  // ==========================================

  /**
   * Encrypts a message body via unique hybrid symmetric/asymmetric generation layout blocks.
   * @param {string} rawTextMessage - Unencrypted text string.
   * @param {CryptoKey} senderPublicKey - Your public key instance.
   * @param {CryptoKey} receiverPublicKey - Target user's public key instance.
   */
  async encryptDirectMessage(rawTextMessage, senderPublicKey, receiverPublicKey) {
    console.log("Encrypting message:", rawTextMessage, senderPublicKey, receiverPublicKey); 
    try {
      const encoder = new TextEncoder();
      const messageBuffer = encoder.encode(rawTextMessage);

      // 1. Generate an ephemeral individual symmetric message key
      const aesKey = await window.crypto.subtle.generateKey(
        { name: "AES-GCM", length: 256 },
        true,
        ["encrypt", "decrypt"]
      );

      const iv = window.crypto.getRandomValues(new Uint8Array(12)); // 12-byte fast IV

      // 2. Symmetric fast block encryption
      const ciphertextBuffer = await window.crypto.subtle.encrypt(
        { name: "AES-GCM", iv: iv },
        aesKey,
        messageBuffer
      );

      // 3. Package the session key for export
      const rawAesKeyBuffer = await window.crypto.subtle.exportKey("raw", aesKey);

      // 4. Asymmetric wrapper for both users to allow bidirectional conversation context views
      const encryptedKeyForReceiver = await window.crypto.subtle.encrypt(
        { name: "RSA-OAEP" },
        receiverPublicKey,
        rawAesKeyBuffer
      );

      const encryptedKeyForSender = await window.crypto.subtle.encrypt(
        { name: "RSA-OAEP" },
        senderPublicKey,
        rawAesKeyBuffer
      );

      return {
        ciphertext: this.arrayBufferToBase64(ciphertextBuffer),
        iv: this.arrayBufferToBase64(iv),
        keyForReceiver: this.arrayBufferToBase64(encryptedKeyForReceiver),
        keyForSender: this.arrayBufferToBase64(encryptedKeyForSender)
      }; 
    } catch (error) {
      console.error("Encryption sequence dropped:", error);
      throw new Error("E2EE payload construction aborted.");
    }
  },

  /**
   * Decrypts a structural hybrid session wrapper down to a plaintext UI readable string.
   */
  async decryptMessage(data, privateKey, currentUserId) {
    if (!data || !privateKey || !currentUserId) return "";
    try {
      const payload = typeof data.content === "string" ? JSON.parse(data.content) : data.content;

      const isMe = data.senderId === currentUserId || data.senderId?._id === currentUserId;
      const encryptedKeyBase64 = isMe ? payload.keyForSender : payload.keyForReceiver;

      if (!encryptedKeyBase64) return "[Corrupted Encryption Frame]";

      // Unpack raw symmetric token using your browser's underlying private key instance
      const rawAesKey = await window.crypto.subtle.decrypt(
        { name: "RSA-OAEP" },
        privateKey,
        this.base64ToArrayBuffer(encryptedKeyBase64)
      );

      const aesKey = await window.crypto.subtle.importKey(
        "raw",
        rawAesKey, 
        "AES-GCM",
        false,
        ["decrypt"]
      );

      const decrypted = await window.crypto.subtle.decrypt(
        { name: "AES-GCM", iv: this.base64ToArrayBuffer(payload.iv) },
        aesKey,
        this.base64ToArrayBuffer(payload.ciphertext)
      );

      return new TextDecoder().decode(decrypted);
    } catch (error) {
      console.error("Decryption failed:", error);
      return "⚠️ Unable to decrypt message";
    }
  },

  // ==========================================
  // 5. ENCRYPTED MULTICAST GROUP LAYER
  // ==========================================

  async decryptGroupKey(conversation, privateKeyObj) {
    if (!conversation.encryptedGroupKey) throw new Error("No encrypted group key found");
    const encryptedKeyBuffer = this.base64ToArrayBuffer(conversation.encryptedGroupKey);

    let privateKey;
    if (privateKeyObj instanceof CryptoKey) {
      privateKey = privateKeyObj;
    } else {
      const privateKeyBuffer = new Uint8Array(privateKeyObj.data);
      privateKey = await window.crypto.subtle.importKey(
        "pkcs8",
        privateKeyBuffer,
        { name: "RSA-OAEP", hash: "SHA-256" },
        true,
        ["decrypt"]
      );
    }

    const decryptedGroupKeyBuffer = await window.crypto.subtle.decrypt(
      { name: "RSA-OAEP" },
      privateKey,
      encryptedKeyBuffer
    );

    return window.crypto.subtle.importKey(
      "raw",
      decryptedGroupKeyBuffer,
      { name: "AES-GCM" },
      true,
      ["encrypt", "decrypt"]
    );
  },

  async encryptGroupMessage(message, groupKey) {
    const encoder = new TextEncoder();
    const data = encoder.encode(message);
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    
    const encrypted = await window.crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      groupKey,
      data
    );
    return {
      ciphertext: this.arrayBufferToBase64(encrypted),
      iv: this.arrayBufferToBase64(iv),
    };
  },

  async decryptGroupMessage(encryptedPayload, groupKey) {
    try {
      const { ciphertext, iv } = encryptedPayload;
      const encryptedBuffer = this.base64ToArrayBuffer(ciphertext);
      const ivBuffer = new Uint8Array(this.base64ToArrayBuffer(iv));
      
      const decrypted = await window.crypto.subtle.decrypt(
        { name: "AES-GCM", iv: ivBuffer },
        groupKey,
        encryptedBuffer
      );

      return new TextDecoder().decode(decrypted);
    } catch (err) {
      console.error("Group decryption breakdown:", err);
      return "⚠️ Unable to decrypt message";
    }
  }
};

export default CryptoUtils;