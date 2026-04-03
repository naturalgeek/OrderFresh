import sharp from 'sharp';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, '..', 'public');

const sizes = [180, 192, 512];

async function generateIcons() {
  const svgBuffer = readFileSync(join(publicDir, 'icon.svg'));

  for (const size of sizes) {
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(join(publicDir, `icon-${size}.png`));

    console.log(`Generated icon-${size}.png`);
  }

  console.log('Icon generation complete!');
}

generateIcons().catch(console.error);
