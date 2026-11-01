import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const from = resolve('node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs');
const to = resolve('public/maplibre/maplibre-gl-worker.mjs');

mkdirSync(dirname(to), { recursive: true });
copyFileSync(from, to);
console.log(`MapLibre worker скопирован в ${to}`);
