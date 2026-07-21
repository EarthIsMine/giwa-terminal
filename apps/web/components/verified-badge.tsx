import type { AssetVerification } from "@giwa/shared";

/**
 * 신원 검증 배지 — 1급 시민 (절대 규칙 6).
 * 기와는 신원 기반 규제 준수 체인이다. 배지는 장식이 아니라
 * "이 자산이 목록에 존재하는 이유"다.
 */
export function VerifiedBadge({
  verification,
}: {
  verification: AssetVerification;
}) {
  return (
    <span
      title={`${verification.label} · 신원 검증 완료`}
      aria-label={`${verification.label} · 신원 검증 완료`}
      className="inline-flex items-center rounded border border-good/25 bg-good/10 p-[3px] text-good"
    >
      <svg
        viewBox="0 0 12 12"
        width={11}
        height={11}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M6 1l3.8 1.4v2.8c0 2.5-1.6 4.3-3.8 5.3C3.8 9.5 2.2 7.7 2.2 5.2V2.4L6 1z" />
        <path d="M4.4 5.9l1.2 1.2 2-2.3" />
      </svg>
    </span>
  );
}
