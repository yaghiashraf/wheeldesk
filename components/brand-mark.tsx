import type { SVGProps } from "react";

type BrandMarkProps = SVGProps<SVGSVGElement> & {
  title?: string;
};

export function BrandMark({ title, ...props }: BrandMarkProps) {
  return (
    <svg
      viewBox="0 0 512 512"
      fill="none"
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      {...props}
    >
      <path d="M230 72A184 184 0 0 0 230 440" stroke="#00E5FF" strokeWidth="24" strokeLinecap="round" />
      <path d="M282 72A184 184 0 0 1 282 440" stroke="#00D4AA" strokeWidth="24" strokeLinecap="round" />
      <path d="M256 100V412" stroke="#4B5260" strokeWidth="12" strokeLinecap="round" />
      <circle cx="256" cy="126" r="17" fill="#07080A" stroke="#00E5FF" strokeWidth="11" />
      <circle cx="256" cy="214" r="20" fill="#07080A" stroke="#00D4AA" strokeWidth="11" />
      <circle cx="256" cy="392" r="17" fill="#07080A" stroke="#00E5FF" strokeWidth="11" />
      <path d="M118 185L202 360L256 272" stroke="#00E5FF" strokeWidth="38" strokeLinecap="square" strokeLinejoin="miter" />
      <path d="M256 272L310 360L394 185" stroke="#00D4AA" strokeWidth="38" strokeLinecap="square" strokeLinejoin="miter" />
    </svg>
  );
}

export function BrandWordmark({ compact = false }: { compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <span className="font-semibold tracking-[-0.025em] text-ink">WheelDesk</span>
      <span
        className={`num rounded-sm border border-cyan/35 bg-cyan/[0.07] font-semibold uppercase tracking-[0.14em] text-cyan ${
          compact ? "px-1 py-0.5 text-[6px]" : "px-1.5 py-0.5 text-[7px]"
        }`}
      >
        Pro
      </span>
    </span>
  );
}
