import { index, onchainTable, primaryKey } from "ponder";

/**
 * 스키마 원칙 (CLAUDE.md 지표 정의):
 * - 모든 화폐 값은 bigint (wei). 환산·포맷팅은 소비자(웹) 몫.
 * - 캔들은 candles_1m 이 원본이고 1h/1d 는 스왑 시점에 같이 upsert 되는 롤업.
 *   변동률·거래량은 캔들에서 읽는다 — 요청 시점에 스왑 원장을 스캔하지 않는다.
 * - quote 는 WETH 고정. WETH 가 끼지 않은 페어는 가격 정의가 없어 인덱싱하지 않는다.
 */

export const pairs = onchainTable("pairs", (t) => ({
  /** 페어 컨트랙트 주소 */
  address: t.hex().primaryKey(),
  /** 비-WETH 쪽 토큰 (터미널에 표시되는 자산) */
  token: t.hex().notNull(),
  /** token 이 token0 인지 — 준비금/금액의 0·1 방향 해석용 */
  tokenIsToken0: t.boolean().notNull(),
  /** 최신 준비금 (Sync 이벤트마다 갱신) */
  tokenReserve: t.bigint().notNull(),
  wethReserve: t.bigint().notNull(),
  /** 토큰 1개당 WETH wei = wethReserve / tokenReserve (지표 정의 §가격) */
  priceWei: t.bigint().notNull(),
  createdAt: t.integer().notNull(),
  createdAtBlock: t.bigint().notNull(),
}));

/** 체결 원장 — 상세 페이지 체결 내역 + distinct tx.origin 거래자 집계의 원본 */
export const trades = onchainTable(
  "trades",
  (t) => ({
    /** txHash-logIndex */
    id: t.text().primaryKey(),
    pair: t.hex().notNull(),
    token: t.hex().notNull(),
    /** 토큰 기준 방향: buy = WETH 지불하고 토큰 수령 */
    side: t.text().notNull().$type<"buy" | "sell">(),
    tokenAmount: t.bigint().notNull(),
    /** quote(WETH) 환산 체결액 — 거래량 합계의 단위 */
    wethAmount: t.bigint().notNull(),
    /** 체결 직후 준비금 비율 가격 (같은 tx 의 Sync 가 먼저 반영됨) */
    priceWei: t.bigint().notNull(),
    /** tx.origin — msg.sender 를 쓰면 라우터 하나로 집계된다 (지표 정의 §거래자 수) */
    origin: t.hex().notNull(),
    txHash: t.hex().notNull(),
    timestamp: t.integer().notNull(),
    block: t.bigint().notNull(),
  }),
  (table) => ({
    pairTimeIdx: index().on(table.pair, table.timestamp),
  }),
);

/** 캔들 — interval: "1m"(원본) | "1h" | "1d". bucket 은 UTC 기준 버킷 시작 unix 초 */
export const candles = onchainTable(
  "candles",
  (t) => ({
    pair: t.hex().notNull(),
    interval: t.text().notNull().$type<"1m" | "1h" | "1d">(),
    bucket: t.integer().notNull(),
    open: t.bigint().notNull(),
    high: t.bigint().notNull(),
    low: t.bigint().notNull(),
    close: t.bigint().notNull(),
    /** quote(WETH) 환산 거래대금 합 */
    volumeWeth: t.bigint().notNull(),
    trades: t.integer().notNull(),
  }),
  (table) => ({
    pk: primaryKey({ columns: [table.pair, table.interval, table.bucket] }),
  }),
);
