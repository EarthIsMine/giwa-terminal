"use client";

import { useMemo, useState } from "react";
import { wei, weiToDisplayKrw } from "@giwa/shared";
import type { AssetMarketWire, CandleWire, ChartInterval } from "@/lib/indexer";
import type { ChartCandle } from "@/components/asset/candle-chart";
import { CandleChart } from "@/components/asset/candle-chart";

/**
 * 기간 전환이 붙은 차트 패널.
 *
 * 유저가 고르는 것은 "기간"이고 캔들 간격은 거기서 따라온다 — 1분봉·15분봉 같은
 * 간격을 직접 노출하지 않는다(절대 규칙 3). 업비트 차트도 기간이 앞에 온다.
 *
 * 간격 세 벌을 서버에서 미리 받아두므로 전환에 네트워크 왕복이 없다.
 */

interface Range {
  key: string;
  label: string;
  interval: ChartInterval;
  /** 표시 구간 길이(초). null = 전체 */
  seconds: number | null;
}

const RANGES: readonly Range[] = [
  { key: "1d", label: "1일", interval: "1m", seconds: 86_400 },
  { key: "7d", label: "7일", interval: "1h", seconds: 7 * 86_400 },
  { key: "30d", label: "30일", interval: "1d", seconds: 30 * 86_400 },
  { key: "all", label: "전체", interval: "1d", seconds: null },
];

const INTERVAL_SECONDS: Record<ChartInterval, number> = {
  "1m": 60,
  "1h": 3_600,
  "1d": 86_400,
};

const INTERVAL_LABEL: Record<ChartInterval, string> = {
  "1m": "분봉",
  "1h": "시간봉",
  "1d": "일봉",
};

/** 인덱서 캔들(wei 문자열) → 차트 float. 환율 있으면 원화, 없으면 ETH 단위 */
function toChartCandles(
  candles: readonly CandleWire[],
  interval: ChartInterval,
  ethKrw: bigint | null,
): ChartCandle[] {
  const toNum = ethKrw
    ? (v: string) => Number(weiToDisplayKrw(wei(BigInt(v)), ethKrw)) / 1_000
    : (v: string) => Number(BigInt(v)) / 1e18;
  return candles.map((c) => ({
    // 일봉 경계는 00:00 UTC = 09:00 KST — 업비트 일봉과 같은 기준이라 그대로 쓴다
    time:
      interval === "1d"
        ? new Date(c.bucket * 1_000).toISOString().slice(0, 10)
        : c.bucket,
    open: toNum(c.open),
    high: toNum(c.high),
    low: toNum(c.low),
    close: toNum(c.close),
    volume: toNum(c.volumeWeth),
  }));
}

/** 원화 축 소수 자리 — formatKrw 표시 규칙과 같은 단계 (≥1000 정수 / ≥100 1자리 / 그 외 2자리) */
function krwDecimals(lastClose: number): number {
  return lastClose >= 1_000 ? 0 : lastClose >= 100 ? 1 : 2;
}

/** 기본 기간 — 일봉이 얕은 테스트넷 초기 구간에서는 더 촘촘한 쪽으로 내려간다 */
function defaultRangeKey(series: AssetMarketWire["series"]): string {
  if (series["1d"].length >= 5) return "30d";
  if (series["1h"].length > 0) return "7d";
  return "all";
}

export function AssetChartPanel({
  series,
  ethKrw: ethKrwRaw,
}: {
  series: AssetMarketWire["series"];
  ethKrw: string | null;
}) {
  const ethKrw = ethKrwRaw ? BigInt(ethKrwRaw) : null;
  const [rangeKey, setRangeKey] = useState(() => defaultRangeKey(series));
  // 서버·클라이언트 렌더가 같은 기준을 쓰도록 한 번만 읽고, 컷오프는 버킷에 맞춰 내린다
  const nowSec = useMemo(() => Math.floor(Date.now() / 1_000), []);

  const range = RANGES.find((r) => r.key === rangeKey) ?? RANGES[0];
  const chartCandles = useMemo(() => {
    if (!range) return [];
    const bucketSec = INTERVAL_SECONDS[range.interval];
    const from =
      range.seconds === null
        ? 0
        : Math.floor((nowSec - range.seconds) / bucketSec) * bucketSec;
    const inWindow = series[range.interval].filter((c) => c.bucket >= from);
    return toChartCandles(inWindow, range.interval, ethKrw);
  }, [series, range, nowSec, ethKrw]);

  const lastClose = chartCandles[chartCandles.length - 1]?.close ?? 0;
  const chartDecimals = ethKrw ? krwDecimals(lastClose) : 8;

  return (
    <div className="mt-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <div
          role="group"
          aria-label="차트 기간"
          className="inline-flex items-center gap-1"
        >
          {RANGES.map((r) => {
            const active = r.key === range?.key;
            return (
              <button
                key={r.key}
                type="button"
                aria-pressed={active}
                onClick={() => setRangeKey(r.key)}
                className={
                  active
                    ? "rounded-md border border-accent/25 bg-accent/15 px-2.5 py-1 text-[12px] font-medium text-ink"
                    : "rounded-md border border-transparent px-2.5 py-1 text-[12px] text-ink-3 transition-colors hover:text-ink-2"
                }
              >
                {r.label}
              </button>
            );
          })}
        </div>
        {range && (
          <span className="text-[11px] text-ink-3">
            {INTERVAL_LABEL[range.interval]} · {chartCandles.length}개 구간
          </span>
        )}
      </div>

      {chartCandles.length > 0 ? (
        <div className="mt-2">
          <CandleChart
            candles={chartCandles}
            decimals={chartDecimals}
            currency={ethKrw ? "krw" : "eth"}
          />
        </div>
      ) : (
        // 빈 차트를 그리지 않고 사실을 말한다 — 무거래와 데이터 없음을 구분한다
        <p className="mt-2 grid h-[440px] place-items-center text-[12.5px] text-ink-3">
          이 기간에는 체결이 없습니다. 다른 기간을 선택해 보세요.
        </p>
      )}
    </div>
  );
}
