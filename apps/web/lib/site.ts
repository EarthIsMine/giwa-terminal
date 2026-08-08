/**
 * 절대 규칙 6이 상시 고지로 못 박은 문장 — 푸터 고지와 분석 범위 카드가 같이 쓴다.
 * 화면마다 따로 쓰면 "투자 보증이 아니다"가 "안전성을 보증하지 않는다" 같은
 * 좁은 주장으로 조용히 약해진다. 문구를 바꿀 일이 있으면 여기서만 바꾼다.
 * (배지 툴팁·자산 보드 등은 앞 문장만 줄여 쓴다 — 표현은 여기에 맞춘다)
 */
export const VERIFICATION_DISCLAIMER =
  "검증은 사기 필터이지 투자 보증이 아닙니다. 발행 시점의 신원과 기와체인에 기록된 안전장치를 확인한 것입니다.";

/** 나루 공식 채널 — 데모 가정 링크. 실제 계정 개설 후 교체한다 */
export const SITE_LINKS = {
  x: "https://x.com/naru_onchain",
  telegram: "https://t.me/naru_kr",
  github: "https://github.com/naru-onchain",
} as const;
