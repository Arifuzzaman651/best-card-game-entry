// Ember Court — the hand-in (Node 22, standard library only).
// The game is plain static files under game/ and its screenshots under
// screenshots/. This program copies both into /output and writes
// /output/dossier.json with the vendored make.fun library, exactly the
// dossier the judge reads. It refuses to hand in a broken entry: the game
// must have an index.html, and there must be 3 or 4 screenshots, or it
// exits before writing anything.
//
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Guardrails first: a missing game or a wrong screenshot count is a
// refused entry, so fail loudly here instead of shipping it.
if (!existsSync(join(here, 'game', 'index.html'))) {
  throw new Error('Ember Court: game/index.html is missing, refusing to hand in.');
}
const shots = existsSync(join(here, 'screenshots'))
  ? readdirSync(join(here, 'screenshots')).filter((name) => !name.startsWith('.'))
  : [];
if (shots.length < 3 || shots.length > 4) {
  throw new Error(`Ember Court: expected 3 or 4 screenshots, found ${shots.length}.`);
}

// The gate's own screenshot caps: each image at most 256 KiB, its long side
// at most 1280 px and its short side at least 480 px. Read the dimensions
// straight out of the file headers (PNG IHDR, JPEG SOF) so a bad shot is
// caught here, not on the server.
function imageSize(path) {
  const buf = readFileSync(path);
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  }
  if (buf[0] === 0xff && buf[1] === 0xd8) {
    let i = 2;
    while (i + 9 < buf.length) {
      if (buf[i] !== 0xff) break;
      const marker = buf[i + 1];
      const len = buf.readUInt16BE(i + 2);
      if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
        return { width: buf.readUInt16BE(i + 7), height: buf.readUInt16BE(i + 5) };
      }
      i += 2 + len;
    }
  }
  throw new Error(`Ember Court: cannot read dimensions of ${path}.`);
}
for (const shot of shots) {
  const path = join(here, 'screenshots', shot);
  const { width, height } = imageSize(path);
  const bytes = readFileSync(path).length;
  const longSide = Math.max(width, height);
  const shortSide = Math.min(width, height);
  if (bytes > 262144 || longSide > 1280 || shortSide < 480) {
    throw new Error(`Ember Court: ${shot} is ${width}x${height}, ${bytes} bytes — outside the gate's screenshot caps.`);
  }
}

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes
// the bytes; the others refuse an entry the scorer would refuse (more than
// 4 screenshots or one over 256 KiB; more than 993 files in game/ or 48 MiB
// of game files, in all, or a path under game/ over 1000 bytes: game/ counts
// beside /output's own 1000-entry cap, its screenshots/ and dossier.json).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);

console.log(`Ember Court handed in: ${shots.length} screenshots (${shots.join(', ')}).`);
