import { wei } from "@giwa/shared";
import type { WeiAmount } from "@giwa/shared";
import { giwaChain } from "@giwa/config";

/**
 * 기와체인 자체의 활동 집계 — 분석 화면의 최상단 레이어.
 *
 * 나루 인덱서는 우리 팩토리 페어만 본다. 체인 전체를 말하려면 원천이 따로 필요해서
 * Blockscout 집계 API 를 쓴다. 여기서 다루는 건 "판이 얼마나 돌아가는가"까지다 —
 * 체인 전체 거래대금·유동성은 전 DEX 인덱싱(P1+) 전에는 알 수 없고, 모르는 값을
 * 추정해서 채우지 않는다 (지표 정의 §환산: 추정치를 확정값처럼 보여주지 않는다).
 *
 * 실패 시 해당 필드만 null → 화면이 그 지표를 감춘다. 보드 전체를 죽이지 않는다.
 */

const BLOCKSCOUT = `${giwaChain.explorerUrl}/api/v2`;

/** 일별 거래 수 한 점 — 날짜는 UTC 기준(Blockscout 원본) */
export interface DailyTxPoint {
  /** YYYY-MM-DD */
  date: string;
  count: number;
}

export interface ChainOverview {
  /** 오늘(UTC) 누적 거래 수 */
  txToday: number | null;
  /** 체인 개통 이래 누적 거래 수 */
  txTotal: number | null;
  /** 체인이 알고 있는 주소 수 (지갑 + 컨트랙트) */
  addressTotal: number | null;
  /** 최신 블록 높이 */
  blockHeight: number | null;
  /** 평균 블록 생성 간격 (초) */
  blockSeconds: number | null;
  /**
   * 최근 체결된 거래의 수수료 중앙값 (wei, L1 데이터 수수료 포함 총액).
   * Blockscout `fee.value` 가 L2 실행분 + l1_fee 합산임을 산술로 확인하고 쓴다.
   */
  medianFeeWei: WeiAmount | null;
  /** 일별 거래 수 (오래된 → 최신). 최대 30일 */
  daily: DailyTxPoint[];
}

/** 문자열·숫자 혼재 필드를 유한한 수로만 통과시킨다 */
function num(v: unknown): number | null {
  const n = typeof v === "string" || typeof v === "number" ? Number(v) : NaN;
  return Number.isFinite(n) ? n : null;
}

async function getJson(path: string, revalidate: number): Promise<unknown> {
  try {
    const res = await fetch(`${BLOCKSCOUT}/${path}`, { next: { revalidate } });
    if (!res.ok) return null;
    return (await res.json()) as unknown;
  } catch {
    return null;
  }
}

/** 체인 집계 — 갱신이 느린 값이라 60초 캐시로 묶는다 */
async function getStats(): Promise<Omit<ChainOverview, "daily" | "medianFeeWei">> {
  const body = await getJson("stats", 60);
  const empty = {
    txToday: null,
    txTotal: null,
    addressTotal: null,
    blockHeight: null,
    blockSeconds: null,
  };
  if (typeof body !== "object" || body === null) return empty;
  const s = body as Record<string, unknown>;
  const blockMs = num(s.average_block_time);
  return {
    txToday: num(s.transactions_today),
    txTotal: num(s.total_transactions),
    addressTotal: num(s.total_addresses),
    blockHeight: num(s.total_blocks),
    // Blockscout 는 밀리초로 준다
    blockSeconds: blockMs === null ? null : blockMs / 1_000,
  };
}

/** 일별 거래 추이 — 하루 한 번 바뀌는 값이라 10분 캐시 */
async function getDaily(): Promise<DailyTxPoint[]> {
  const body = await getJson("stats/charts/transactions", 600);
  if (typeof body !== "object" || body === null || !("chart_data" in body)) return [];
  const rows = (body as { chart_data: unknown }).chart_data;
  if (!Array.isArray(rows)) return [];

  const out: DailyTxPoint[] = [];
  for (const row of rows) {
    if (typeof row !== "object" || row === null) continue;
    const r = row as Record<string, unknown>;
    const count = num(r.transactions_count);
    if (typeof r.date !== "string" || count === null) continue;
    out.push({ date: r.date, count });
  }
  // Blockscout 는 최신순으로 준다 — 차트는 시간순이라 뒤집고 30일로 자른다
  return out.slice(0, 30).reverse();
}

/**
 * 최근 거래 수수료의 중앙값.
 *
 * 평균이 아니라 중앙값을 쓴다 — 컨트랙트 배포 한 건이 평균을 수십 배로 끌어올려
 * "이 체인 비싸네"로 읽히게 만든다. 중앙값은 흔한 거래 한 건의 체감에 가깝다.
 */
async function getMedianFee(): Promise<WeiAmount | null> {
  const body = await getJson("transactions?filter=validated", 60);
  if (typeof body !== "object" || body === null || !("items" in body)) return null;
  const items = (body as { items: unknown }).items;
  if (!Array.isArray(items)) return null;

  const fees: bigint[] = [];
  for (const row of items) {
    if (typeof row !== "object" || row === null) continue;
    const fee = (row as Record<string, unknown>).fee;
    if (typeof fee !== "object" || fee === null) continue;
    const value = (fee as Record<string, unknown>).value;
    if (typeof value !== "string" || !/^\d+$/.test(value)) continue;
    const v = BigInt(value);
    if (v > 0n) fees.push(v);
  }
  if (fees.length === 0) return null;

  fees.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  return wei(fees[Math.floor(fees.length / 2)] as bigint);
}

/**
 * 세 원천을 한 번에 — 하나가 죽어도 나머지는 살아서 내려간다.
 * 페이지가 서버 컴포넌트라 내부 API 라우트를 거치지 않고 직접 부른다.
 */
export async function getChainOverview(): Promise<ChainOverview> {
  const [stats, daily, medianFeeWei] = await Promise.all([
    getStats(),
    getDaily(),
    getMedianFee(),
  ]);
  return { ...stats, daily, medianFeeWei };
}
