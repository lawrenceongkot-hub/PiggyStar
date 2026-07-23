import sharp from "sharp";
import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(__dirname, "..", "public");

/**
* Flood-fill from all four corners to detect contiguous background pixels.
* This handles gradient backgrounds correctly since it follows the color
* variation outward from the corners.
*/
function floodFillBackground(pixels, w, h, tolerance) {
const ch = 4;
const visited = new Uint8Array(w * h);
const isBg = new Uint8Array(w * h); // 1 = background pixel
const queue = [];

// Seed from all four edges
const edgePixels = [];
// Top row
for (let x = 0; x < w; x++) edgePixels.push([x, 0]);
// Bottom row
for (let x = 0; x < w; x++) edgePixels.push([x, h - 1]);
// Left column (excluding corners)
for (let y = 1; y < h - 1; y++) edgePixels.push([0, y]);
// Right column (excluding corners)
for (let y = 1; y < h - 1; y++) edgePixels.push([w - 1, y]);

for (const [sx, sy] of edgePixels) {
const si = (sy * w + sx) * ch;
const sr = pixels[si],
sg = pixels[si + 1],
sb = pixels[si + 2];
queue.push({ x: sx, y: sy, seedR: sr, seedG: sg, seedB: sb });
}

// BFS flood-fill
let head = 0;
while (head < queue.length) {
const { x, y, seedR, seedG, seedB } = queue[head++];
if (x < 0 || x >= w || y < 0 || y >= h) continue;
const idx = y * w + x;
if (visited[idx]) continue;
visited[idx] = 1;

const pi = idx * ch;
const r = pixels[pi],
g = pixels[pi + 1],
b = pixels[pi + 2];

// Check if this pixel is within tolerance of the seed color
const dist = Math.sqrt(
(r - seedR) ** 2 + (g - seedG) ** 2 + (b - seedB) ** 2
);
if (dist > tolerance) continue;

isBg[idx] = 1;

// Add neighbors with the same seed color reference
for (const [nx, ny] of [
[x - 1, y],
[x + 1, y],
[x, y - 1],
[x, y + 1],
]) {
if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
const nIdx = ny * w + nx;
if (!visited[nIdx]) {
queue.push({ x: nx, y: ny, seedR, seedG, seedB });
}
}
}
}

return isBg;
}

async function removeBackground(inputPath, outputPath) {
console.log(`\n🔄 Processing: ${path.basename(inputPath)}`);

// Load with alpha
const { data, info } = await sharp(inputPath)
.ensureAlpha()
.raw()
.toBuffer({ resolveWithObject: true });

const w = info.width;
const h = info.height;
const ch = info.channels; // should be 4
const pixels = Buffer.from(data); // mutable copy

// Detect if already has transparency
let transparentCount = 0;
for (let i = 3; i < pixels.length; i += 4) {
if (pixels[i] === 0) transparentCount++;
}
const pctTransparent = (transparentCount / (w * h)) * 100;
console.log(`Existing transparent pixels: ${pctTransparent.toFixed(1)}%`);

// If more than 30% of image is already transparent, skip
if (pctTransparent > 30) {
console.log("⏭️ Image already has substantial transparency, skipping.");
return;
}

// Flood-fill to detect background with multiple tolerance levels
// Use a moderate tolerance for the gradient background
const tolerance = 40;
const isBg = floodFillBackground(pixels, w, h, tolerance);

// Count what we found
let bgCount = 0;
for (let i = 0; i < w * h; i++) {
if (isBg[i]) bgCount++;
}
console.log(
`Flood-fill found ${bgCount} background pixels (${(
(bgCount / (w * h)) *
100
).toFixed(1)}%)`
);

// Step 1: Set all flood-filled background pixels to transparent
let backgroundSet = 0;
for (let y = 0; y < h; y++) {
for (let x = 0; x < w; x++) {
const idx = y * w + x;
if (isBg[idx]) {
const pi = idx * 4;
pixels[pi + 3] = 0; // alpha = 0
backgroundSet++;
}
}
}

// Step 2: Edge refinement — feather alpha on edge pixels
for (let y = 0; y < h; y++) {
for (let x = 0; x < w; x++) {
const idx = y * w + x;
const pi = idx * 4;
if (pixels[pi + 3] === 0) continue; // already transparent

// Count how many transparent background neighbors this pixel has
let bgNeighborCount = 0;
const neighborDirs = [
[-1, 0],
[1, 0],
[0, -1],
[0, 1],
[-1, -1],
[1, -1],
[-1, 1],
[1, 1],
];

for (const [dx, dy] of neighborDirs) {
const nx = x + dx;
const ny = y + dy;
if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
if (pixels[(ny * w + nx) * 4 + 3] === 0) {
bgNeighborCount++;
}
}

if (bgNeighborCount > 0) {
// Reduce alpha proportionally
const factor = Math.min(1, (bgNeighborCount / 8) * 2.0);
pixels[pi + 3] = Math.max(
0,
Math.round(pixels[pi + 3] * (1 - factor * 0.35))
);
}
}
}

// Step 3: Write output as true transparent PNG
await sharp(pixels, {
raw: { width: w, height: h, channels: 4 },
})
.png({ compressionLevel: 9, palette: false })
.toFile(outputPath);

console.log(`✅ Saved: ${path.basename(outputPath)}`);

// Verify
const { data: verifyData, info: verifyInfo } = await sharp(outputPath)
.ensureAlpha()
.raw()
.toBuffer({ resolveWithObject: true });

let finalTransparent = 0;
let finalSemi = 0;
const totalPx = verifyInfo.width * verifyInfo.height;
for (let i = 3; i < verifyData.length; i += 4) {
if (verifyData[i] === 0) finalTransparent++;
else if (verifyData[i] < 255) finalSemi++;
}
console.log(
` Transparent: ${((finalTransparent / totalPx) * 100).toFixed(1)}%`
);
console.log(
` Semi-transparent (edge): ${((finalSemi / totalPx) * 100).toFixed(1)}%`
);
console.log(
` Opaque (logo): ${(
((totalPx - finalTransparent - finalSemi) / totalPx) *
100
).toFixed(1)}%`
);
}

async function main() {
const files = [
{
input: path.join(publicDir, "Main-logo.png"),
output: path.join(publicDir, "Main-logo.png"),
},
{
input: path.join(publicDir, "piggyStar-logo.png"),
output: path.join(publicDir, "piggyStar-logo.png"),
},
];

for (const f of files) {
// Backup original (overwrite if exists)
const backupPath = f.input.replace(".png", ".original.png");
await fs.copyFile(f.input, backupPath);
console.log(`📦 Backup created: ${path.basename(backupPath)}`);

await removeBackground(f.input, f.output);
}

console.log("\n🎉 Done! All logos now have transparent backgrounds.");
}

main().catch(console.error);