import fs from 'fs';
import path from 'path';

const assetsDir = path.resolve(__dirname, '../../../../assets');

function scanDirectory(dir: string, baseDir = ''): any[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const results: any[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relPath = path.join(baseDir, entry.name).replace(/\\/g, '/');

    if (entry.isDirectory()) {
      results.push(...scanDirectory(fullPath, relPath));
    } else if (entry.isFile() && /\.(jpg|jpeg|png|webp)$/i.test(entry.name)) {
      const stats = fs.statSync(fullPath);
      results.push({
        path: relPath,
        sizeBytes: stats.size,
        filename: entry.name,
      });
    }
  }

  return results;
}

export function buildManifest() {
  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
  }

  const images = scanDirectory(assetsDir);
  const manifest = {
    version: '1.0.0',
    generatedAt: new Date().toISOString(),
    totalAssets: images.length,
    assets: images,
  };

  const manifestPath = path.join(assetsDir, 'manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
  console.log(`✅ Asset manifest generated with ${images.length} verified image assets at ${manifestPath}`);
  return manifest;
}

if (require.main === module) {
  buildManifest();
}
