import crypto from "node:crypto";

// Кеш для публічного ключа (згідно з документацією не треба запитувати кожного разу)
let cachedPubKey: string | null = null;
let keyLastFetched = 0;
const KEY_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 години

/**
 * Отримати публічний ключ Monobank для верифікації підпису webhook
 * Згідно з документацією: https://api.monobank.ua/api/merchant/pubkey
 */
export async function getMonobankPublicKey(token: string): Promise<string | null> {
  const now = Date.now();
  
  // Використовуємо кешований ключ якщо він свіжий
  if (cachedPubKey && (now - keyLastFetched) < KEY_CACHE_TTL) {
    return cachedPubKey;
  }

  try {
    const response = await fetch("https://api.monobank.ua/api/merchant/pubkey", {
      method: "GET",
      headers: {
        "X-Token": token,
      },
    });

    if (!response.ok) {
      console.error(`Failed to fetch Monobank pubkey: ${response.status}`);
      return null;
    }

    const data = await response.json();
    if (data?.key) {
      cachedPubKey = data.key;
      keyLastFetched = now;
      console.log("Monobank public key updated successfully");
      return cachedPubKey;
    }
    
    return null;
  } catch (error) {
    console.error("Error fetching Monobank public key:", error);
    return null;
  }
}

/**
 * Верифікувати підпис webhook від Monobank Personal API
 * Згідно з документацією використовується RSA SHA-256
 */
export function verifyMonobankSignature(
  message: string,
  signature: string,
  publicKeyBase64: string
): boolean {
  try {
    console.log("Verifying signature with key length:", publicKeyBase64.length);
    
    const signatureBuffer = Buffer.from(signature, "base64");
    
    // Для Personal API ключ приходить у форматі base64 DER
    const publicKeyBuffer = Buffer.from(publicKeyBase64, "base64");
    
    // Створюємо публічний ключ з DER формату
    const publicKey = crypto.createPublicKey({
      key: publicKeyBuffer,
      format: "der",
      type: "spki"
    });

    // Верифікуємо підпис з SHA-256
    const result = crypto.verify(
      "sha256",
      Buffer.from(message, "utf8"),
      publicKey,
      signatureBuffer
    );

    console.log("Signature verification result:", result);
    return result;
  } catch (error) {
    console.error("Error verifying Monobank signature:", error);
    return false;
  }
}
