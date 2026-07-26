import { index, onchainTable, primaryKey } from "ponder";

/**
 * 스키마 원칙 (CLAUDE.md 지표 정의):
 * - 모든 화폐 값은 bigint (wei). 환산·포맷팅은 소비자(웹) 몫.
 * - 캔들은 candles_1m 이 원본이고 1h/1d 는 스왑 시점에 같이 upsert 되는 롤업.
 *   변동률·거래량은 캔들에서 읽는다 — 요청 시점에 스왑 원장을 스캔하지 않는다.
 * - quote 는 WETH 고정. WETH 가 끼지 않은 페어는 가격 정의가 없어 인덱싱하지 않는다.
 */

/** 발행 게이트 통과 자산 — 발행자 라벨(피드 "발행자 매도" 판정)과 신규 상장 피드의 원천 */
export const tokens = onchainTable("tokens", (t) => ({
  /** 토큰 컨트랙트 주소 */
  address: t.hex().primaryKey(),
  /** 발행자 지갑 — 심사에서 등록되는 라벨. 이 지갑의 매도는 금액 무관 무조건 피드 노출 */
  issuer: t.hex().notNull(),
  name: t.text().notNull(),
  symbol: t.text().notNull(),
  identityRef: t.hex().notNull(),
  totalSupply: t.bigint().notNull(),
  issuedAt: t.integer().notNull(),
  /** TokenListed(거래 개시) 시점 — 발행만 되고 미상장이면 null */
  pair: t.hex(),
  listedAt: t.integer(),
}));

/** 홀더 원장 — Transfer 델타 누적. 인프라 주소(페어·팩토리)도 쌓되 표시는 소비자가 거른다 */
export const holders = onchainTable(
  "holders",
  (t) => ({
    token: t.hex().notNull(),
    address: t.hex().notNull(),
    balance: t.bigint().notNull(),
  }),
  (table) => ({
    pk: primaryKey({ columns: [table.token, table.address] }),
    tokenBalanceIdx: index().on(table.token, table.balance),
  }),
);

/**
 * 전송 그래프 에지 — (token, from, to) 별 직접 전송 누적.
 * 버블맵 정의(명세서 §2.2): 에지 = 두 지갑 간 직접 전송 이력.
 * 인프라(페어·팩토리·라우터) 필터는 조회 시점에 한다 — 기록 시점엔 pair 미확정 전송이 있다.
 */
export const transferLinks = onchainTable(
  "transfer_links",
  (t) => ({
    token: t.hex().notNull(),
    from: t.hex().notNull(),
    to: t.hex().notNull(),
    count: t.integer().notNull(),
    totalAmount: t.bigint().notNull(),
    lastAt: t.integer().notNull(),
  }),
  (table) => ({
    pk: primaryKey({ columns: [table.token, table.from, table.to] }),
    tokenIdx: index().on(table.token),
  }),
);

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
  /** 직전 Sync 이전 가격 — Swap 시점엔 "이 체결 직전 가격"이 된다.
   *  캔들 버킷 첫 체결의 open 으로 써서 첫 체결의 가격 변동이 변동률에서
   *  누락되는 편향을 막는다 (지표 정의 §가격) */
  prevPriceWei: t.bigint().notNull(),
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
    /** 정렬 안정성용 — id(txHash-logIndex)는 텍스트라 사전순 정렬이 틀린다 */
    logIndex: t.integer().notNull(),
  }),
  (table) => ({
    pairTimeIdx: index().on(table.pair, table.timestamp),
  }),
);

/**
 * 페어 활동 원장 — 매수·매도·유동성 공급·회수 전부.
 * "거래 수"는 이 원장의 건수이고 "참여 인원"은 distinct tx.origin 이다
 * (체결만 세면 유동성 공급자가 지표에서 빠진다).
 */
export const activities = onchainTable(
  "activities",
  (t) => ({
    /** txHash-logIndex */
    id: t.text().primaryKey(),
    pair: t.hex().notNull(),
    /** buy·sell = 스왑 방향, add·remove = 유동성 공급/회수 */
    kind: t.text().notNull().$type<"buy" | "sell" | "add" | "remove">(),
    /** tx.origin — 라우터 경유라 msg.sender 를 쓰면 안 된다 (지표 정의 §거래자 수) */
    origin: t.hex().notNull(),
    timestamp: t.integer().notNull(),
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
