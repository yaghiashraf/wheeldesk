// Generates the PWA icon set from an inline SVG.
// Run: node scripts/make-icons.mjs
//
// The mark is the wheel itself: two heavy arcs chasing each other around a hub,
// arrowheads showing the direction of the cycle. The split is the strategy —
// cyan is the cash-secured put leg, teal the covered call leg, and the amber hub
// is the premium the rotation exists to collect.
//
// Every decision here is driven by the 16px taskbar case. Strokes are 54/512
// (~1.7px at 16) because anything thinner greys out; there are exactly three
// elements because a fourth becomes noise; the arcs break at two gaps so the
// silhouette is a broken ring rather than a solid "O", which is what separates
// it from every spinner and settings glyph at a glance. The hub keeps the
// centre from reading as a hole. No text — glyphs are unreadable at this size.
//
// Geometry sits inside the central 80% so the maskable variant survives a
// circular crop: max extent is 174/512 from centre against a 204.8 budget.
import sharp from "sharp";
import { mkdir } from "node:fs/promises";

const CYAN = "#00E5FF";
const TEAL = "#00D4AA";
const AMBER = "#FFB800";
const GROUND = "#07080A";

function wheelSvg({ rounded }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="${rounded ? 112 : 0}" fill="${GROUND}"/>
  <g fill="none" stroke-width="54" stroke-linecap="butt">
    <path d="M 141.7 190.0 A 132 132 0 0 1 388 256" stroke="${CYAN}"/>
    <path d="M 370.3 322.0 A 132 132 0 0 1 124 256" stroke="${TEAL}"/>
  </g>
  <path d="M 388 308 L 346 250 L 430 250 Z" fill="${CYAN}"/>
  <path d="M 124 204 L 166 262 L 82 262 Z" fill="${TEAL}"/>
  <circle cx="256" cy="256" r="38" fill="${AMBER}"/>
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
