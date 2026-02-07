import { ipcMain } from 'electron';
import * as crypto from 'crypto';

/**
 * Handlers IPC pour les opérations cryptographiques natives
 * Utilise le module crypto de Node.js pour de meilleures performances
 */

export function registerCryptoHandlers() {
  // Chiffrement AES-256-GCM
  ipcMain.handle('crypto:encrypt', async (_event, data: string, key: string): Promise<string> => {
    try {
      // Dérive une clé de 256 bits depuis la passphrase
      const derivedKey = crypto.scryptSync(key, 'salt', 32);
      
      // Génère un IV aléatoire
      const iv = crypto.randomBytes(16);
      
      // Crée le cipher
      const cipher = crypto.createCipheriv('aes-256-gcm', derivedKey, iv);
      
      // Chiffre les données
      let encrypted = cipher.update(data, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      // Récupère le tag d'authentification
      const authTag = cipher.getAuthTag();
      
      // Retourne IV + authTag + données chiffrées
      return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
    } catch (error) {
      console.error('❌ Erreur chiffrement:', error);
      throw error;
    }
  });

  // Déchiffrement AES-256-GCM
  ipcMain.handle('crypto:decrypt', async (_event, encrypted: string, key: string): Promise<string> => {
    try {
      // Sépare IV, authTag et données
      const parts = encrypted.split(':');
      if (parts.length !== 3) {
        throw new Error('Format de données chiffrées invalide');
      }
      
      const iv = Buffer.from(parts[0], 'hex');
      const authTag = Buffer.from(parts[1], 'hex');
      const encryptedData = parts[2];
      
      // Dérive la même clé
      const derivedKey = crypto.scryptSync(key, 'salt', 32);
      
      // Crée le decipher
      const decipher = crypto.createDecipheriv('aes-256-gcm', derivedKey, iv);
      decipher.setAuthTag(authTag);
      
      // Déchiffre
      let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      console.error('❌ Erreur déchiffrement:', error);
      throw error;
    }
  });

  // Hash SHA-256
  ipcMain.handle('crypto:hash', async (_event, data: string): Promise<string> => {
    try {
      return crypto.createHash('sha256').update(data).digest('hex');
    } catch (error) {
      console.error('❌ Erreur hash:', error);
      throw error;
    }
  });

  // Génération de bytes aléatoires cryptographiquement sécurisés
  ipcMain.handle('crypto:randomBytes', async (_event, length: number): Promise<Uint8Array> => {
    try {
      return crypto.randomBytes(length);
    } catch (error) {
      console.error('❌ Erreur randomBytes:', error);
      throw error;
    }
  });

  // console.log('✅ Crypto handlers enregistrés');
}
