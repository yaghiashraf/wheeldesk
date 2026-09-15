// Generates every brand raster and SVG from lib/brand-geometry.ts.
// Run: node scripts/make-icons.mjs
//
// The mark is a W built from two interlocking V's, one for the put leg and one
// for the covered call, with the strike diamond at their crossing picked out
// in cyan. Platinum on near-black, one accent: sophistication comes from what
// is left out.
//
// There are two optical cuts. The display cut (40/512 strokes) is for app
// icons, where its woven notch reads. Favicons at 16–48px use the heavier,
// larger favicon cut, because a 40/512 stroke is 1.25px at 16 and greys out.
// The maskable icon scales the glyph into the central 80% so a circular crop
// never clips a terminal.
import sharp from "sharp";
import { mkdir, writeFile } from "node:fs/promises";
import { DISPLAY_CUT, FAVICON_CUT, wheelDeskGlyph } from "../lib/brand-geometry.ts";

const CYAN = "#00E5FF";

function glyphMarkup(cut, fill) {
  const { arms, strike } = wheelDeskGlyph(cut);
  return `${arms.map((points) => `<polygon points="${points}" fill="${fill}"/>`).join("")}<polygon points="${strike}" fill="${CYAN}"/>`;
}

function iconSvg({ cut, radius, bright = false, hairline = false }) {
  const [light, dark] = bright ? ["#FFFFFF", "#CDD2DA"] : ["#F8FAFC", "#AEB5C1"];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="ground" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0D0F13"/><stop offset="1" stop-color="#050607"/></linearGradient>
    <linearGradient id="platinum" x1="0" y1="0" x2="0" y2="512" gradientUnits="userSpaceOnUse"><stop offset="0.28" stop-color="${light}"/><stop offset="0.72" stop-color="${dark}"/></linearGradient>
  </defs>
  <rect width="512" height="512" rx="${radius}" fill="url(#ground)"/>
  ${hairline ? `<rect x="2" y="2" width="508" height="508" rx="${radius - 2}" fill="none" stroke="#FFFFFF" stroke-opacity="0.08" stroke-width="3"/>` : ""}
  ${glyphMarkup(cut, "url(#platinum)")}
</svg>`;
}

const markSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">${glyphMarkup(DISPLAY_CUT, "#E9ECF0")}</svg>\n`;

function png(svg, size) {
  // Rasterize at the target size or above; upscaling a 512 raster blurs edges.
  const density = Math.max(72, (72 * size) / 512);
  return sharp(Buffer.from(svg), { density }).resize(size, size).png().toBuffer();
}

/** ICO container holding PNG frames; sharp cannot write .ico itself. */
function ico(frames) {
  const header = Buffer.alloc(6 + frames.length * 16);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(frames.length, 4);
  let offset = header.length;
  frames.forEach(({ size, data }, index) => {
    const entry = 6 + index * 16;
    header.writeUInt8(size >= 256 ? 0 : size, entry);
    header.writeUInt8(size >= 256 ? 0 : size, entry + 1);
    header.writeUInt16LE(1, entry + 4);
    header.writeUInt16LE(32, entry + 6);
    header.writeUInt32LE(data.length, entry + 8);
    header.writeUInt32LE(offset, entry + 12);
    offset += data.length;
  });
  return Buffer.concat([header, ...frames.map((frame) => frame.data)]);
}

const appIcon = iconSvg({ cut: DISPLAY_CUT, radius: 116, hairline: true });
const fullBleed = iconSvg({ cut: DISPLAY_CUT, radius: 0 });
const maskable = iconSvg({ cut: { ...DISPLAY_CUT, scale: 0.84 }, radius: 0 });
const favicon = iconSvg({ cut: FAVICON_CUT, radius: 104, bright: true });

const jobs = [
  { file: "public/icon-192.png", svg: appIcon, size: 192 },
  { file: "public/icon-512.png", svg: appIcon, size: 512 },
  { file: "public/icon-maskable-512.png", svg: maskable, size: 512 },
  { file: "app/icon.png", svg: favicon, size: 64 },
  { file: "app/apple-icon.png", svg: fullBleed, size: 180 },
  { file: "docs/brand/wheeldeskpro-mark.png", svg: appIcon, size: 1024 },
];

await mkdir("docs/brand", { recursive: true });
for (const job of jobs) {
  await writeFile(job.file, await png(job.svg, job.size));
  console.log(`${job.file} (${job.size}px)`);
}

const frames = [];
for (const size of [16, 32, 48]) frames.push({ size, data: await png(favicon, size) });
await writeFile("app/favicon.ico", ico(frames));
console.log("app/favicon.ico (16, 32, 48px)");

await writeFile("public/wheeldeskpro-mark.svg", markSvg);
await writeFile("public/wheeldeskpro-app-icon.svg", `${appIcon}\n`);
console.log("public/wheeldeskpro-mark.svg, public/wheeldeskpro-app-icon.svg");
