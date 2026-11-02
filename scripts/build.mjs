import { mkdir, copyFile, rm } from 'node:fs/promises';
const files = ['index.html', 'styles.css', 'app.mjs', 'core.mjs', 'favicon.svg'];
const output = new URL('../dist/', import.meta.url);
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
for (const file of files)
  await copyFile(new URL(`../${file}`, import.meta.url), new URL(file, output));
console.log(`Built ${files.length} static files in dist/`);
