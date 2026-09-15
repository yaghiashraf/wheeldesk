/**
 * WheelDesk monogram geometry, shared by the in-app mark and the icon script.
 *
 * Two V's interlock to form the W: one is the cash-secured put leg, the other
 * the covered call. The diamond where they cross is the strike, the one price
 * both legs share, so it alone carries the cyan accent. Everything else stays
 * platinum; restraint is the point.
 *
 * Shapes are explicit polygons rather than clipped strokes so the SVG needs no
 * mask or gradient ids, which would collide when the mark renders twice on a
 * page. Coordinates are on a 512 grid.
 */

export type GlyphCut = {
  /** Stroke width. Heavier cuts survive favicon sizes. */
  weight: number;
  /** Half the distance between the two valleys. */
  spread: number;
  /** Horizontal run per unit of vertical rise along each arm. */
  slant: number;
  height: number;
  centerY?: number;
  /** Uniform scale about the canvas centre, for maskable safe zones. */
  scale?: number;
};

/** Hairline-leaning cut for app icons and the navigation mark. */
export const DISPLAY_CUT: GlyphCut = { weight: 40, spread: 62, slant: 0.44, height: 212 };

/** Heavier, larger cut drawn for 16–48px, where the display cut greys out. */
export const FAVICON_CUT: GlyphCut = { weight: 54, spread: 64, slant: 0.44, height: 244 };

type Point = [number, number];

function polygon(points: Point[], scale: number): string {
  return points
    .map(([x, y]) => `${round(256 + (x - 256) * scale)},${round(256 + (y - 256) * scale)}`)
    .join(" ");
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Tight viewBox around the glyph, for inline marks that sit beside text. */
export function glyphViewBox(cut: GlyphCut, padding = 4): string {
  const { weight, spread, slant, height, centerY = 256 } = cut;
  const half = weight / 2 / Math.cos(Math.atan(slant));
  const left = 256 - spread - slant * height - half - padding;
  const top = centerY - height / 2 - padding;
  return `${round(left)} ${round(top)} ${round((256 - left) * 2)} ${round(height + padding * 2)}`;
}

export function wheelDeskGlyph(cut: GlyphCut): { arms: string[]; strike: string } {
  const { weight, spread, slant, height, centerY = 256, scale = 1 } = cut;
  const top = centerY - height / 2;
  const bottom = centerY + height / 2;
  // Horizontal half-thickness of a slanted stroke with square-cut terminals.
  const half = weight / 2 / Math.cos(Math.atan(slant));
  const run = slant * height;

  const arm = (topX: number, bottomX: number): string =>
    polygon(
      [
        [topX - half, top],
        [topX + half, top],
        [bottomX + half, bottom],
        [bottomX - half, bottom],
      ],
      scale,
    );

  const leftValley = 256 - spread;
  const rightValley = 256 + spread;
  const arms = [
    arm(leftValley - run, leftValley),
    arm(leftValley + run, leftValley),
    arm(rightValley - run, rightValley),
    arm(rightValley + run, rightValley),
  ];

  // Rhombus where the put leg's rising arm crosses the call leg's falling arm.
  const rise = (offset: number) => bottom - offset / slant;
  const strikeTop = Math.max(top, rise(spread + half));
  const topWidth = strikeTop === top ? spread + half - slant * height : 0;
  const strike = polygon(
    [
      ...(topWidth > 0
        ? ([
            [256 - topWidth, top],
            [256 + topWidth, top],
          ] as Point[])
        : ([[256, strikeTop]] as Point[])),
      [256 + half, rise(spread)],
      [256, rise(spread - half)],
      [256 - half, rise(spread)],
    ],
    scale,
  );

  return { arms, strike };
}
