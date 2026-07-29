/**
 * 나루 포인트 시즌 0 화면 시안용 예시 값.
 *
 * 실적립 원장이 아니다. 시즌 0 집계 서버(P1)가 열리기 전까지 화면 구성을
 * 보여주기 위한 값이며, 화면에 "예시" 라벨을 달고만 쓴다 — 라벨 없이 쓰면
 * 실데이터로 오인되고, 그건 테스트넷 시드조차 명시하는 이 제품의 원칙
 * (절대 규칙 5)과 어긋난다.
 *
 * 시즌 0 가동 시 이 파일을 통째로 지우고 집계 API 응답으로 갈아끼운다.
 * 그래서 타입을 실제 응답이 될 모양으로 미리 맞춰 둔다.
 *
 * 카피 주의: 수익·보상 보장 표현 금지 (절대 규칙 2). "참여", "배분", "문턱"만 쓴다.
 */

export interface PointsSnapshotPreview {
  /** 현재까지 쌓인 점수 */
  total: number;
  /** 15일 롤링으로 곧 소멸할 점수 */
  expiring: number;
  /** 소멸까지 남은 일수 */
  expiringInDays: number;
  /** 참여 지갑 중 상위 몇 % (낮을수록 상위) */
  percentile: number;
}

export interface ListingEventPreview {
  symbol: string;
  nameKo: string;
  issuerName: string;
  /** 참여 확정에 필요한 문턱 점수 */
  threshold: number;
  /** 마감까지 남은 기간 — 서버·클라이언트 시각차를 만들지 않으려 문자열로 고정 */
  closesIn: string;
  /** 현재 문턱을 넘긴 인증 지갑 수 */
  qualified: number;
  /**
   * 이 상장에서 포인트 참여자에게 배분되는 총 수량 (토큰 단위).
   * 한 지갑 몫 = 이 값 ÷ 참여 확정 지갑 수 — 균등 배분이라 나눗셈 하나다.
   */
  allocationTokens: number;
  /**
   * 상장 시작 가격 (0.001원 단위) — 초기 예치 비율로 정해지는 시작가.
   * 몫의 원화 환산 참고값에만 쓴다. "수익"이라는 말은 어떤 화면에서도 쓰지
   * 않는다 (기획서 §4.4 기대이익 암시 금지) — 수량과 환산 참고값까지가 사실이다.
   */
  listPriceKrwMilli: number;
}

export const PREVIEW_SNAPSHOT: PointsSnapshotPreview = {
  total: 1_240,
  expiring: 80,
  expiringInDays: 4,
  percentile: 12,
};

export const PREVIEW_EVENTS: ListingEventPreview[] = [
  {
    symbol: "ONGGI",
    nameKo: "옹기",
    issuerName: "울산옹기마을",
    threshold: 900,
    closesIn: "3일 뒤 마감",
    qualified: 412,
    allocationTokens: 100_000,
    listPriceKrwMilli: 30_000, // 상장가 ₩30 (예시)
  },
  {
    symbol: "JAGAE",
    nameKo: "자개",
    issuerName: "통영자개공방",
    threshold: 1_500,
    closesIn: "9일 뒤 마감",
    qualified: 88,
    allocationTokens: 60_000,
    listPriceKrwMilli: 12_000, // 상장가 ₩12 (예시)
  },
];
