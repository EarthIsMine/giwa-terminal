/**
 * 인덱서(가격 API) 리더 - 서버 전용.
 *
 * INDEXER_URL 미설정·다운·데이터 없음이면 null 을 돌려주고,
 * 상세 화면은 기존 "인덱서 연결 후 제공" 자리표시로 폴백한다.
 * 추정치를 확정값처럼 보여주지 않는다 - 실패는 조용히 감춘다 (절대 규칙 1의 정신).
 *
 * bigint 는 전부 문자열 와이어 포맷 - 표시 직전에만 복원한다.
 */

export interface CandleWire {
  /** 버킷 시작 unix 초 (UTC) */
  bucket: number;
  open: string;
  high: string;
  low: string;
  close: string;
  /** quote(WETH) 환산 거래대금 wei */
  volumeWeth: string;
  trades: number;
}

export interface TradeWire {
  id: string;
  side: "buy" | "sell";
  tokenAmount: string;
  wethAmount: string;
  priceWei: string;
  txHash: string;
  timestamp: number;
}

export interface StatsWire {
  /** 당일(UTC) 1d 캔들 open 대비 close, bps */
  changeBps: number;
  volumeWethToday: string;
  tradesToday: number;
  tradersToday: number;
}

/** 캔들 간격 - 인덱서 candles_1m 원본과 1h/1d 롤업 */
export type ChartInterval = "1m" | "1h" | "1d";

export interface AssetMarketWire {
  /** 간격별 캔들 전량. 어느 기간을 보여줄지는 화면(기간 버튼)이 고른다 */
  series: Record<ChartInterval, CandleWire[]>;
  trades: TradeWire[];
  stats: StatsWire | null;
}

/** 나루터 소식 피드 항목 - 판정은 인덱서 API, 문구는 웹이 만든다 */
export interface FeedItemWire {
  id: string;
  type: "listed" | "issuer_sell" | "large_trade";
  token: `0x${string}`;
  symbol: string;
  timestamp: number;
  side?: "buy" | "sell";
  wethAmount?: string;
  /** 풀 유동성 대비 체결 비율 ‰ */
  poolPermille?: number;
  txHash?: `0x${string}`;
}

/** 홀더 관계도 노드 - 클러스터 판정은 인덱서 API(union-find)가 끝내서 내려준다 */
export interface GraphNodeWire {
  address: `0x${string}`;
  balance: string;
  /** 총공급 대비 ‰ */
  permille: number;
  isIssuer: boolean;
  /** 발행자와 같은 연결 성분 (1단계 이상 전송으로 이어짐) */
  issuerLinked: boolean;
  /** 2인 이상 성분 소속 여부 */
  clustered: boolean;
  clusterId: string;
}

export interface HolderGraphWire {
  totalSupply: string;
  issuer: `0x${string}`;
  nodes: GraphNodeWire[];
  links: { source: string; target: string }[];
}

const INDEXER_URL = process.env.INDEXER_URL ?? null;

/**
 * 인덱서 응답 상한. 인덱서는 죽는 것보다 "살아 있는데 안 답하는" 상태가 흔하다
 * (콜드 스타트·DB 락·인덱스 없는 스캔). 타임아웃이 없으면 fetch 가 reject 하지
 * 않아 아래 catch 도 안 걸리고, 이 모듈을 Promise.all 로 묶는 라우트가 통째로
 * 멈춘다 - 화면은 에러조차 못 띄우고 무한 로딩이 된다 (lib/analysis.ts 와 같은 방어).
 */
const INDEXER_TIMEOUT_MS = 8_000;

async function fetchJson<T>(path: string): Promise<T | null> {
  if (!INDEXER_URL) return null;
  try {
    const res = await fetch(`${INDEXER_URL}${path}`, {
      next: { revalidate: 15 },
      signal: AbortSignal.timeout(INDEXER_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

/** 나루터 소식 - 인덱서 미연결·실패면 null (홈은 섹션 자체를 감춘다) */
export async function getFeed(): Promise<FeedItemWire[] | null> {
  const res = await fetchJson<{ items: FeedItemWire[] }>("/feed?limit=8");
  return res?.items ?? null;
}

/** 보드 기간 윈도우 - 일 단위만 연다 (절대 규칙 3) */
export const BOARD_WINDOWS = ["24h", "7d", "30d", "all"] as const;
export type BoardWindow = (typeof BOARD_WINDOWS)[number];

export interface WindowStatWire {
  changeBps: number;
  volumeWeth: string;
  trades: number;
  /** distinct tx.origin - 매수·매도·유동성 공급/회수 전부 포함 */
  traders: number;
}

export interface BoardPairWire {
  windows: Partial<Record<BoardWindow, WindowStatWire>>;
}

/** 페어 주소(소문자) → 추이·윈도우별 통계. 데이터 없는 페어·윈도우는 키 자체가 없다 */
export type BoardStatsWire = Record<string, BoardPairWire>;

/** 보드 기간별 변동률·거래량 - 인덱서 미연결이면 null (보드는 지표 열을 감춘다) */
export async function getBoardStats(): Promise<BoardStatsWire | null> {
  const res = await fetchJson<{ pairs: BoardStatsWire }>("/board");
  return res?.pairs ?? null;
}

/** 홀더 관계도 - 인덱서 미연결·미인덱싱이면 null (자리표시 폴백) */
export async function getHolderGraph(
  token: `0x${string}`,
): Promise<HolderGraphWire | null> {
  return fetchJson<HolderGraphWire>(`/graph/${token}`);
}

/**
 * 상세 화면 시장 데이터 - 간격 세 벌을 한 번에 받는다.
 * 기간 버튼(1일·7일·30일·전체)이 클라이언트에서 즉시 전환되려면 왕복이 없어야 한다.
 * 캔들은 체결이 있는 버킷에만 생기므로 테스트넷 규모에서는 세 벌 합쳐도 가볍다.
 */
export async function getAssetMarket(
  pair: `0x${string}`,
): Promise<AssetMarketWire | null> {
  const [minute, hourly, daily, tradesRes, stats] = await Promise.all([
    fetchJson<{ candles: CandleWire[] }>(`/candles/${pair}?interval=1m&limit=1000`),
    fetchJson<{ candles: CandleWire[] }>(`/candles/${pair}?interval=1h&limit=336`),
    fetchJson<{ candles: CandleWire[] }>(`/candles/${pair}?interval=1d&limit=400`),
    fetchJson<{ trades: TradeWire[] }>(`/trades/${pair}?limit=30`),
    fetchJson<StatsWire>(`/stats/${pair}`),
  ]);

  const series: Record<ChartInterval, CandleWire[]> = {
    "1m": minute?.candles ?? [],
    "1h": hourly?.candles ?? [],
    "1d": daily?.candles ?? [],
  };
  // 어느 간격에도 캔들이 없으면 인덱서 미연결·미체결 - 자리표시로 폴백한다
  if (Object.values(series).every((c) => c.length === 0)) return null;

  return { series, trades: tradesRes?.trades ?? [], stats };
}

/** 지갑 체결 한 건 - 손익 계산 재료 (지표 정의 §손익) */
export interface WalletTradeWire {
  token: `0x${string}`;
  side: "buy" | "sell";
  tokenAmount: string;
  wethAmount: string;
  timestamp: number;
}

export interface WalletTradesWire {
  /** limit 을 넘겨 앞부분이 잘렸는지 - 잘렸으면 이동평균 원가를 신뢰할 수 없다 */
  truncated: boolean;
  trades: WalletTradeWire[];
}

/**
 * 지갑의 전체 체결 원장 (오름차순). 인덱서 미연결이면 null → 화면은 손익 열을 감춘다.
 * 개인 지갑 데이터라 캐시하지 않는다 - 잔고와 같은 신선도 기준.
 */
export async function getWalletTrades(
  address: `0x${string}`,
): Promise<WalletTradesWire | null> {
  if (!INDEXER_URL) return null;
  try {
    const res = await fetch(`${INDEXER_URL}/wallet/${address}/trades`, {
      cache: "no-store",
      signal: AbortSignal.timeout(INDEXER_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    return (await res.json()) as WalletTradesWire;
  } catch {
    return null;
  }
}
