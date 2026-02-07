/**
 * Bibliothèque TOTP (Time-based One-Time Password)
 * Compatible avec Google Authenticator, Microsoft Authenticator, Authy, etc.
 */

/**
 * Génère un secret TOTP aléatoire (base32)
 */
export function generateTOTPSecret(): string {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'; // Base32
  const length = 32;
  let secret = '';
  
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  
  for (let i = 0; i < length; i++) {
    secret += charset[array[i] % charset.length];
  }
  
  return secret;
}

/**
 * Génère l'URL otpauth:// pour le QR code
 */
export function generateTOTPUri(
  secret: string,
  accountName: string,
  issuer: string = 'Cryptos Coffre'
): string {
  const params = new URLSearchParams({
    secret,
    issuer,
    algorithm: 'SHA1',
    digits: '6',
    period: '30',
  });
  
  return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(accountName)}?${params}`;
}

/**
 * Convertit base32 en buffer
 */
function base32ToBuffer(base32: string): Uint8Array {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = '';
  
  for (let i = 0; i < base32.length; i++) {
    const val = alphabet.indexOf(base32[i].toUpperCase());
    if (val === -1) continue;
    bits += val.toString(2).padStart(5, '0');
  }
  
  const bytes = new Uint8Array(Math.floor(bits.length / 8));
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(bits.substr(i * 8, 8), 2);
  }
  
  return bytes;
}

/**
 * Génère un HMAC-SHA1
 */
async function hmacSha1(key: Uint8Array, message: Uint8Array): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key.buffer as ArrayBuffer,
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, message.buffer as ArrayBuffer);
  return new Uint8Array(signature);
}

/**
 * Génère un code TOTP pour un timestamp donné
 */
async function generateTOTPCode(secret: string, timestamp: number): Promise<string> {
  const time = Math.floor(timestamp / 30000); // 30 secondes
  const timeBuffer = new Uint8Array(8);
  
  // Convertir le time en buffer big-endian
  let timeValue = time;
  for (let i = 7; i >= 0; i--) {
    timeBuffer[i] = timeValue & 0xff;
    timeValue = timeValue >> 8;
  }
  
  const key = base32ToBuffer(secret);
  const hmac = await hmacSha1(key as Uint8Array, timeBuffer as Uint8Array);
  
  // Dynamic truncation
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code = (
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff)
  ) % 1000000;
  
  return code.toString().padStart(6, '0');
}

/**
 * Vérifie un code TOTP
 * Accepte les codes avec une marge de ±1 période (30s) pour la dérive d'horloge
 */
export async function verifyTOTPCode(secret: string, code: string): Promise<boolean> {
  const now = Date.now();
  
  // Vérifie le code actuel et ±1 période
  for (let i = -1; i <= 1; i++) {
    const timestamp = now + (i * 30000);
    const expectedCode = await generateTOTPCode(secret, timestamp);
    
    if (expectedCode === code) {
      return true;
    }
  }
  
  return false;
}

/**
 * Génère le code TOTP actuel (pour affichage/test)
 */
export async function getCurrentTOTPCode(secret: string): Promise<string> {
  return generateTOTPCode(secret, Date.now());
}

/**
 * Calcule le temps restant avant le prochain code (en secondes)
 */
export function getTOTPTimeRemaining(): number {
  return 30 - Math.floor((Date.now() / 1000) % 30);
}

/**
 * Formate un code TOTP avec un espace au milieu (123 456)
 */
export function formatTOTPCode(code: string): string {
  if (code.length !== 6) return code;
  return `${code.slice(0, 3)} ${code.slice(3)}`;
}
