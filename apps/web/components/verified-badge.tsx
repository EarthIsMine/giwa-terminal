import type { AssetVerification } from "@giwa/shared";

/**
 * 신원 검증 배지 — 1급 시민 (절대 규칙 6).
 * 기와는 신원 기반 규제 준수 체인이다. 배지는 장식이 아니라
 * "이 자산이 목록에 존재하는 이유"다.
 *
 * 주체를 "나루 검증"으로 명시한다 — GIWA 공식 인증으로 오인될 표기 금지
 * (기획서 v1.3 §4.3). 사기 필터 고지는 툴팁·접근성 라벨에 상시 포함.
 */
export function VerifiedBadge({
  verification,
}: {
  verification: AssetVerification;
}) {
  const disclosure = `${verification.label} · 검증은 사기 필터이며 투자 보증이 아닙니다`;
  return (
    <span
      title={disclosure}
      aria-label={disclosure}
      className="inline-flex items-center gap-1 rounded border border-good/25 bg-good/10 px-1.5 py-[2.5px] text-[11.5px] font-medium leading-none text-good"
    >
      <svg
        viewBox="0 0 12 12"
        width={10}
        height={10}
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
      {verification.label}
    </span>
  );
}
