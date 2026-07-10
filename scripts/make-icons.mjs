// Generates the PWA icon set from an inline SVG (Quant Research Desk style:
// pure black, neon cyan wheel with three spokes — the three-step cycle).
// Run: node scripts/make-icons.mjs
import sharp from "sharp";
import { mkdir } from "node:fs/promises";

function wheelSvg({ rounded }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="${rounded ? 96 : 0}" fill="#000000"/>
  <g fill="none" stroke-linecap="round">
    <circle cx="256" cy="256" r="150" stroke="#00E5FF" stroke-width="24"/>
    <circle cx="256" cy="256" r="62" stroke="#00D4AA" stroke-width="18"/>
    <g stroke="#00E5FF" stroke-width="20">
      <line x1="256" y1="118" x2="256" y2="182"/>
      <line x1="136.5" y1="325" x2="192" y2="293"/>
      <line x1="375.5" y1="325" x2="320" y2="293"/>
    </g>
    <circle cx="362" cy="150" r="26" fill="#FFB800" stroke="#000000" stroke-width="10"/>
  </g>
</svg>`;
}

const jobs = [
  { file: "public/icon-192.png", size: 192, rounded: true },
  { file: "public/icon-512.png", size: 512, rounded: true },
  { file: "public/icon-maskable-512.png", size: 512, rounded: false },
  { file: "app/icon.png", size: 64, rounded: true },
  { file: "app/apple-icon.png", size: 180, rounded: false },
];

await mkdir("public", { recursive: true });
for (const job of jobs) {
  await sharp(Buffer.from(wheelSvg(job)))
    .resize(job.size, job.size)
    .png()
    .toFile(job.file);
  console.log(`${job.file} (${job.size}px)`);
}
