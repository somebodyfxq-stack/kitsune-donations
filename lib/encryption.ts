import crypto from 'node:crypto';

// Отримуємо та валідуємо ключ шифрування
function getEncryptionKey(): Buffer {
  const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
  if (!ENCRYPTION_KEY) {
    throw new Error('ENCRYPTION_KEY environment variable is required for token encryption');
  }

  // Перевірити довжину ключа (потрібно 32 байти для AES-256)
  const keyBuffer = Buffer.from(ENCRYPTION_KEY, 'hex');
  if (keyBuffer.length !== 32) {
    throw new Error('ENCRYPTION_KEY must be a 64-character hex string (32 bytes)');
  }

  return keyBuffer;
}

/**
 * Шифрує токен Monobank перед збереженням в БД
 * Використовує AES-256-CBC з випадковим IV для кожного токена
 */
export function encryptToken(token: string): string {
  if (!token) return '';
  
  const keyBuffer = getEncryptionKey();
  
  // Генеруємо випадковий IV (16 байт для CBC)
  const iv = crypto.randomBytes(16);
  
  // Створюємо cipher
  const cipher = crypto.createCipheriv('aes-256-cbc', keyBuffer as any, iv as any);
  
  // Шифруємо токен
  let encrypted = cipher.update(token, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  // Повертаємо IV + encrypted data як hex string
  return iv.toString('hex') + ':' + encrypted;
}

/**
 * Розшифровує токен Monobank з БД
 * Повертає null якщо токен не може бути розшифрований
 */
export function decryptToken(encryptedToken: string): string | null {
  if (!encryptedToken) return null;
  
  try {
    const keyBuffer = getEncryptionKey();
    
    // Розбиваємо на частини: IV:encryptedData
    const parts = encryptedToken.split(':');
    if (parts.length !== 2) {
      console.warn('Invalid encrypted token format');
      return null;
    }
    
    const [ivHex, encryptedHex] = parts;
    
    // Конвертуємо hex назад в буфери
    const iv = Buffer.from(ivHex, 'hex');
    const encrypted = Buffer.from(encryptedHex, 'hex');
    
    // Створюємо decipher
    const decipher = crypto.createDecipheriv('aes-256-cbc', keyBuffer as any, iv as any);
    
    // Розшифровуємо
    let decrypted = decipher.update(encrypted as any, undefined, 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Failed to decrypt token:', error);
    return null;
  }
}

/**
 * Перевіряє чи токен зашифрований
 */
export function isEncryptedToken(token: string): boolean {
  return token.includes(':') && token.split(':').length === 2;
}

