import sharp from 'sharp';

// Usage: node scripts/make-post-cover.mjs <source-artwork.png>
const SRC = process.argv[2];
if (!SRC) {
  console.error('usage: node scripts/make-post-cover.mjs <source-artwork.png>');
  process.exit(1);
}
const OUT = 'src/assets/posts/왜-스타트업에서-day1부터-쿠버네티스를-선택했을까';

// The artwork is flat: a blue heptagon with a white wheel inside it, a wordmark
// in near-black, and a soft shadow, all on near-white. Only the wordmark and
// the ground need to change between themes, so the heptagon is masked out and
// everything else is remapped along a single ink->paper ramp. That keeps the
// antialiasing intact: a pixel half-covered by a letter stays half-covered.
const { data, info } = await sharp(SRC).flatten({ background: '#ffffff' }).raw().toBuffer({ resolveWithObject: true });
const { width: W, height: H, channels: C } = info;
const N = W * H;

// The heptagon, told apart from the wordmark by the SHAPE of its falloff
// rather than by how blue it is — the wordmark is navy, which is also blue,
// and by any "B > R" test it looks like the logo.
//
// Both marks sit on white, so a pixel is that mark blended with paper. Divide
// how far it has fallen from white in red by how far it has fallen in blue and
// the coverage cancels out, leaving a constant per colour: the heptagon
// (35,102,232) gives (254-35)/(254-232) = 10, the wordmark (1,28,61) gives
// (254-1)/(254-61) = 1.3. Anything past 3 is the logo at any coverage.
const blue = new Uint8Array(N);
for (let i = 0; i < N; i++) {
  const o = i * C;
  const dr = 254 - data[o];
  const db = 254 - data[o + 2];
  // The second test skips pixels that are within a shade of the paper, where
  // the ratio is being read off two or three levels of noise.
  if (dr > db * 3 && dr + db > 20) blue[i] = 1;
}

// The wheel is white, so it is a hole in that mask. Flood the non-blue pixels
// from the border: whatever the flood cannot reach is enclosed by the shape.
const outside = new Uint8Array(N);
const queue = new Int32Array(N);
let head = 0, tail = 0;
const push = (i) => { if (!blue[i] && !outside[i]) { outside[i] = 1; queue[tail++] = i; } };
for (let x = 0; x < W; x++) { push(x); push((H - 1) * W + x); }
for (let y = 0; y < H; y++) { push(y * W); push(y * W + W - 1); }
while (head < tail) {
  const i = queue[head++];
  const x = i % W, y = (i / W) | 0;
  if (x > 0) push(i - 1);
  if (x < W - 1) push(i + 1);
  if (y > 0) push(i - W);
  if (y < H - 1) push(i + W);
}

const hex = (s) => [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)];

// Ends of the ramp, measured off the source: 24 is the wordmark's own navy,
// 246 is the paper. Anything above 246 (the shadow) clamps to paper.
const INK = 24, PAPER = 246;

function render(paperHex, inkHex) {
  const paper = hex(paperHex), ink = hex(inkHex);
  const out = Buffer.allocUnsafe(N * 3);
  for (let i = 0; i < N; i++) {
    const o = i * C, q = i * 3;
    if (blue[i] || !outside[i]) {
      out[q] = data[o]; out[q + 1] = data[o + 1]; out[q + 2] = data[o + 2];
      continue;
    }
    const lum = 0.299 * data[o] + 0.587 * data[o + 1] + 0.114 * data[o + 2];
    const t = Math.min(1, Math.max(0, (lum - INK) / (PAPER - INK)));
    out[q] = Math.round(ink[0] + (paper[0] - ink[0]) * t);
    out[q + 1] = Math.round(ink[1] + (paper[1] - ink[1]) * t);
    out[q + 2] = Math.round(ink[2] + (paper[2] - ink[2]) * t);
  }
  return sharp(out, { raw: { width: W, height: H, channels: 3 } });
}

// 1200x630 is what the schema asks a cover to be, and letterboxing onto it
// rather than cropping means the index card can use object-fit: cover without
// ever cutting into the wordmark.
async function write(name, paperHex, inkHex) {
  const art = await render(paperHex, inkHex)
    .trim({ background: paperHex, threshold: 12 })
    .resize({ width: 1020, height: 470, fit: 'inside', withoutEnlargement: true })
    .png()
    .toBuffer();

  const file = `${OUT}/${name}.webp`;
  await sharp({
    create: { width: 1200, height: 630, channels: 3, background: paperHex },
  })
    .composite([{ input: art, gravity: 'centre' }])
    .webp({ quality: 82, effort: 6 })
    .toFile(file);
  const m = await sharp(file).metadata();
  console.log(name, `${m.width}x${m.height}`, `${(m.size / 1024).toFixed(1)}kB`);
}

// The paper is each theme's own --background, so the plate blends into the page
// instead of sitting on it as a lighter or darker rectangle.
await write('day1-light', '#ffffff', '#00021c');
await write('day1-dark', '#292a2d', '#e6e6ec');
