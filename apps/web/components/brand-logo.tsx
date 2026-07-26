/** 나루(NARU) 심볼 — 나룻배와 물결. "업비트에서 기와체인으로 오는 나룻길" */
export function BrandLogo({ size = 26 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="text-accent"
    >
      {/* 삿대 */}
      <path d="M12 8.6V4.2" />
      {/* 나룻배 */}
      <path d="M4.5 8.8c2.3 3.4 12.7 3.4 15 0" />
      {/* 물결 */}
      <path d="M2.6 15.2c1.4-1.5 2.8-1.5 4.2 0s2.8 1.5 4.2 0 2.8-1.5 4.2 0 2.8 1.5 4.2 0" />
      <path d="M7 19.4c1.4-1.5 2.8-1.5 4.2 0s2.8 1.5 4.2 0" opacity="0.55" />
    </svg>
  );
}
