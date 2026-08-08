/**
 * 절대 규칙 6이 상시 고지로 못 박은 문장 — 배지 툴팁·자산 보드·자산 상세·
 * 분석 범위·푸터·기술 문서가 전부 여기서 가져다 쓴다.
 *
 * 화면마다 손으로 쓰면 표현이 조용히 갈라진다. 실제로 "사기 필터이지"와
 * "사기 필터이며"가 섞여 있었고, 한 곳은 "투자 안전성을 보증하지 않습니다"로
 * 주장 자체가 좁아져 있었다. 문구를 바꿀 일이 있으면 여기서만 바꾼다.
 *
 * 앞 문장(LEAD)만 쓰는 자리가 있어 둘로 나눠 둔다. 마침표는 쓰는 쪽이 붙인다
 * — 툴팁·용어 강조처럼 문장부호 없이 들어가는 자리가 있다.
 */
export const VERIFICATION_LEAD =
  "검증은 사기를 거르는 절차일 뿐 투자 보증이 아닙니다";

export const VERIFICATION_DETAIL =
  "발행 시점의 신원과 기와체인에 기록된 안전장치를 확인한 것입니다.";

export const VERIFICATION_DISCLAIMER = `${VERIFICATION_LEAD}. ${VERIFICATION_DETAIL}`;

/** 나루 공식 채널 — 데모 가정 링크. 실제 계정 개설 후 교체한다 */
export const SITE_LINKS = {
  x: "https://x.com/naru_onchain",
  telegram: "https://t.me/naru_kr",
  github: "https://github.com/naru-onchain",
} as const;
