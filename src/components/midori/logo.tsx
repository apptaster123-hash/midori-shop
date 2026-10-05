// The Midori brand mark: one open ensō brush circle enclosing 緑,
// with the lowercase wordmark. Used in the nav; the same drawing is
// app/icon.svg (the browser tab favicon).
export function Logo() {
  return (
    <span className="flex items-baseline gap-2">
      <svg
        aria-hidden="true"
        width={30}
        height={30}
        viewBox="0 0 48 48"
        fill="none"
        className="relative top-[3px] shrink-0 self-center text-sage-deep"
      >
        <path
          d="M 28.5 7.3 A 17.3 17.3 0 1 0 40.7 19.5"
          stroke="currentColor"
          strokeWidth="2.6"
          strokeLinecap="round"
        />
        <text
          x="24"
          y="25"
          textAnchor="middle"
          dominantBaseline="central"
          fontSize="16"
          fill="currentColor"
          style={{ fontFamily: "var(--font-jp), 'Hiragino Mincho ProN', 'Yu Mincho', serif" }}
        >
          緑
        </text>
      </svg>
      <span className="font-display text-[1.4rem] leading-none tracking-[0.04em] text-ink">
        midori
      </span>
    </span>
  );
}
