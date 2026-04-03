import { writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, '..', 'public');

const version = {
  buildTime: Date.now(),
  version: process.env.npm_package_version || '0.0.0'
};

writeFileSync(
  join(publicDir, 'version.json'),
  JSON.stringify(version, null, 2)
);

console.log(`Generated version.json: ${version.version} (${new Date(version.buildTime).toISOString()})`);
