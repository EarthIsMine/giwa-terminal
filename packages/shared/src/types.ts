/**
 * 절대 규칙 1: 온체인 값과 원화 환산 값을 타입 레벨에서 분리한다.
 * WeiAmount 를 DisplayKrw 자리에 넣으면(혹은 반대) 컴파일이 깨져야 한다.
 */

declare const __brand: unique symbol;
type Brand<T, B extends string> = T & { readonly [__brand]: B };

/** 온체인 wei 값 (ETH 18 decimals 기준) */
export type WeiAmount = Brand<bigint, "WeiAmount">;

/**
 * 원화 환산 표시값 - 밀리원(0.001원) 단위 bigint.
 * 온체인에 원화는 존재하지 않는다. 이 값은 오직 표시용이다.
 * 소수 셋째 자리까지의 headroom 은 저가 자산(₩42.06 등) 표기를 위한 것.
 */
export type DisplayKrw = Brand<bigint, "DisplayKrw">;

/** DisplayKrw 1원 = 1_000 밀리원 */
export const KRW_SCALE = 1_000n;

export function wei(v: bigint): WeiAmount {
  return v as WeiAmount;
}

export function displayKrw(milliKrw: bigint): DisplayKrw {
  return milliKrw as DisplayKrw;
}

/** 변동률은 화폐가 아니므로 정수 bps(1/100 %)로 다룬다. float 금지 유지 */
export type BasisPoints = number;

export type StatWindow = "today" | "week" | "month";

export const STAT_WINDOWS: readonly StatWindow[] = ["today", "week", "month"];

export const STAT_WINDOW_LABEL: Record<StatWindow, string> = {
  today: "오늘",
  week: "1주",
  month: "1개월",
};

/**
 * 절대 규칙 6: 신원 검증은 1급 시민 - 스키마 설계 시점부터 자리를 잡는다.
 * 검증되지 않은 자산은 이 터미널에 표시되지 않는다.
 */
export interface AssetVerification {
  status: "verified";
  /** dojang: 도장 어테스테이션 / giwa-id: GIWA ID 연동 발행 주체 */
  method: "dojang" | "giwa-id";
  label: string;
}

/** 윈도우별 집계 지표 - 정의는 CLAUDE.md "지표 정의" 섹션이 원본 */
export interface WindowStats {
  /** 캔들 open 대비 종가, bps */
  changeBps: BasisPoints;
  /** quote(WETH) 환산 거래대금 */
  volumeWei: WeiAmount;
  /** distinct tx.origin - msg.sender 를 쓰면 라우터 하나로 집계된다 */
  traders: number;
  /** 스파크라인용 가격 추이 (상대값 12포인트) */
  trend: readonly number[];
}

/** 자산 공식 채널 - 발행 주체가 발행 시 등록, 발행자 서명으로 변경 */
export interface AssetLinks {
  website?: string;
  x?: string;
  telegram?: string;
}

export interface VerifiedAsset {
  address: `0x${string}`;
  symbol: string;
  nameKo: string;
  links?: AssetLinks;
  /** 기준(quote) 자산 여부 - WETH. 모든 가격의 분모가 된다 */
  isQuoteAnchor: boolean;
  verification: AssetVerification;
  /** 발행 주체 표시명 - 발행 게이트(TokenFactory) 레지스트리의 발행자 메타에서 온다 */
  issuerName: string;
  /** quote 토큰(WETH) 기준 가격, wei */
  priceWei: WeiAmount;
  /** 풀 보유 quote 잔고 × 2 (V2 기준) */
  liquidityWei: WeiAmount;
  /**
   * 총 발행량(토큰 최소 단위, 18 decimals 가정).
   * 시가총액 = totalSupply × price.
   * 데모 시드 정책: 소각·락업 물량 없음 가정, 전량 포함 (지표 정의 "시가총액" 참고)
   */
  totalSupply: bigint;
  stats: Record<StatWindow, WindowStats>;
}

/** 네트워크 단위 집계 - 자산별 합산과 달리 distinct 값은 별도로 집계해야 한다 */
export interface NetworkWindowStats {
  /** distinct tx.origin (자산별 합산 시 중복 계상되므로 별도 필드) */
  distinctTraders: number;
  swapCount: number;
}
