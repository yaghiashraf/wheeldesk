import type { SVGProps } from "react";
import { DISPLAY_CUT, FAVICON_CUT, glyphViewBox, wheelDeskGlyph } from "@/lib/brand-geometry";

type BrandMarkProps = SVGProps<SVGSVGElement> & {
  title?: string;
  /** The heavier favicon cut keeps the monogram crisp below ~16px tall. */
  small?: boolean;
};

const DISPLAY_GLYPH = { ...wheelDeskGlyph(DISPLAY_CUT), viewBox: glyphViewBox(DISPLAY_CUT) };
const SMALL_GLYPH = { ...wheelDeskGlyph(FAVICON_CUT), viewBox: glyphViewBox(FAVICON_CUT) };

export function BrandMark({ title, small = false, ...props }: BrandMarkProps) {
  const glyph = small ? SMALL_GLYPH : DISPLAY_GLYPH;
  return (
    <svg
      viewBox={glyph.viewBox}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      {...props}
    >
      {glyph.arms.map((points) => (
        <polygon key={points} points={points} fill="#E9ECF0" />
      ))}
      <polygon points={glyph.strike} fill="#00E5FF" />
    </svg>
  );
}

export function BrandWordmark({ compact = false }: { compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <span className="font-semibold tracking-[-0.025em] text-ink">WheelDesk</span>
      <span
        className={`num rounded-sm border border-edge-2 font-medium uppercase tracking-[0.18em] text-ink-2 ${
          compact ? "px-1 py-0.5 text-[7px] leading-[9px]" : "px-1.5 py-0.5 text-[8px] leading-[10px]"
        }`}
      >
        Pro
      </span>
    </span>
  );
}
