const fs = require('fs-extra');
const path = require('path');

/**
 * Script pour copier le build de Cryptos-Services vers dist-web/
 */

const SOURCE = path.resolve(__dirname, '../../Cryptos-Services/out');
const DEST = path.resolve(__dirname, '../dist-web');

async function copyWebBuild() {
  try {
    console.log('🔄 Copie du build Cryptos-Services...');
    console.log(`📂 Source: ${SOURCE}`);
    console.log(`📂 Destination: ${DEST}`);

    // Vérifie que le build existe
    if (!fs.existsSync(SOURCE)) {
      console.error('❌ Build introuvable ! Exécutez "npm run build" dans Cryptos-Services d\'abord.');
      process.exit(1);
    }

    // Nettoie la destination
    if (fs.existsSync(DEST)) {
      await fs.remove(DEST);
      console.log('🧹 Ancien build nettoyé');
    }

    // Copie les fichiers
    await fs.copy(SOURCE, DEST);

    console.log('✅ Build copié avec succès !');
    console.log(`📊 Taille: ${(await getFolderSize(DEST) / 1024 / 1024).toFixed(2)} MB`);
  } catch (error) {
    console.error('❌ Erreur lors de la copie:', error);
    process.exit(1);
  }
}

async function getFolderSize(folderPath) {
  let size = 0;
  const files = await fs.readdir(folderPath);
  
  for (const file of files) {
    const filePath = path.join(folderPath, file);
    const stats = await fs.stat(filePath);
    
    if (stats.isDirectory()) {
      size += await getFolderSize(filePath);
    } else {
      size += stats.size;
    }
  }
  
  return size;
}

copyWebBuild();
