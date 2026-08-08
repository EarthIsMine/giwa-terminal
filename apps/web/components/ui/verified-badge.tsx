import type { AssetVerification } from "@giwa/shared";
import { VERIFICATION_LEAD } from "@/lib/site";

/**
 * 신원 검증 배지 — 1급 시민 (절대 규칙 6).
 * 기와는 신원 기반 규제 준수 체인이다. 배지는 장식이 아니라
 * "이 자산이 목록에 존재하는 이유"다.
 *
 * 주체를 "나루 검증"으로 명시한다 — GIWA 공식 인증으로 오인될 표기 금지
 * (기획서 v1.3 §4.3). 검증 고지는 툴팁·접근성 라벨에 상시 포함.
 */
export function VerifiedBadge({
  verification,
}: {
  verification: AssetVerification;
}) {
  // 라벨 문구는 배지에 찍지 않는다 — 좁은 셀에서 줄바꿈이 생겨 목록이 흐트러진다.
  // 주체·고지는 툴팁과 접근성 라벨로 전달하고, 본문은 자산 상세의 "신원 검증" 카드가 맡는다.
  const disclosure = `${verification.label} · ${VERIFICATION_LEAD}`;
  return (
    <span
      title={disclosure}
      aria-label={disclosure}
      className="inline-flex shrink-0 items-center rounded border border-good/25 bg-good/10 p-[3px] text-good"
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
