// Copy set data (sheets.json) into dist, mirroring src/sets/<code>/, since tsc
// does not emit .json files. Run after `tsc -p tsconfig.build.json`.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const setsDir = path.join(root, 'src', 'sets');

let n = 0;
for (const code of fs.readdirSync(setsDir)) {
  const src = path.join(setsDir, code, 'sheets.json');
  if (!fs.existsSync(src)) continue; // e.g. 2ed reuses leb's sheets.json
  const dest = path.join(root, 'dist', 'sets', code, 'sheets.json');
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
  console.log('copied data:', path.relative(root, dest));
  n++;
}
console.log(`copied ${n} data file(s) into dist`);
