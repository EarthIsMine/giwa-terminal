import {
  formatChangeBps,
  formatCount,
  formatEth,
  formatKrwCompact,
  wei,
  weiToDisplayKrw,
} from "@giwa/shared";
import type { AssetMarketWire, CandleWire } from "@/lib/indexer";
import type { ChartCandle } from "@/components/asset/candle-chart";
import { CandleChart } from "@/components/asset/candle-chart";
import { TradeHistory } from "@/components/asset/trade-history";

/** 인덱서 캔들(wei 문자열) → 차트 float. 환율 있으면 원화, 없으면 ETH 단위 */
function toChartCandles(
  candles: CandleWire[],
  interval: "1h" | "1d",
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

/** 차트·체결 섹션 — 인덱서 데이터. 미연결·데이터 없음이면 자리표시 폴백 */
export function AssetDetailChart({
  market,
  symbol,
  ethKrw,
}: {
  market: AssetMarketWire | null;
  symbol: string;
  ethKrw: bigint | null;
}) {
  if (!market) {
    return (
      <section className="grid min-h-[320px] place-items-center rounded-xl carved p-8 text-center">
        <div>
          <p className="text-[15px] font-semibold text-ink-2">
            가격 차트 · 체결 내역
          </p>
          <p className="mx-auto mt-2 max-w-[420px] text-[12.5px] leading-relaxed text-ink-3">
            인덱서 연결 후 제공됩니다. 지금 이 순간에도 데모 시드 봇이
            온체인 거래 데이터를 쌓는 중이라, 연결 시점에 실제 캔들이
            그려집니다.
          </p>
        </div>
      </section>
    );
  }

  const chartCandles = toChartCandles(market.candles, market.interval, ethKrw);
  const lastClose = chartCandles[chartCandles.length - 1]?.close ?? 0;
  const chartDecimals = ethKrw ? krwDecimals(lastClose) : 8;

  return (
    <>
      <section className="rounded-xl carved p-5">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h2 className="text-[15px] font-semibold">가격 차트</h2>
          <span className="text-[11px] text-ink-3">
            {market.interval === "1d" ? "일봉" : "시간봉"} ·{" "}
            {ethKrw ? "원화 환산(업비트 KRW-ETH 시세)" : "ETH 표시"} ·
            테스트넷 시드 데이터
          </span>
          {market.stats && (
            <span className="ml-auto flex flex-wrap items-center gap-x-3 text-[11.5px] text-ink-3">
              <span>
                오늘{" "}
                <b
                  className={`font-mono font-semibold tabular-nums ${market.stats.changeBps >= 0 ? "text-up" : "text-down"}`}
                >
                  {formatChangeBps(market.stats.changeBps)}
                </b>
              </span>
              <span>
                거래대금{" "}
                <b className="font-mono font-semibold tabular-nums text-ink-2">
                  {ethKrw
                    ? `${formatKrwCompact(
                        weiToDisplayKrw(
                          wei(BigInt(market.stats.volumeWethToday)),
                          ethKrw,
                        ),
                      )}원`
                    : `${formatEth(wei(BigInt(market.stats.volumeWethToday)), 4)} ETH`}
                </b>
              </span>
              <span>
                참여{" "}
                <b className="font-mono font-semibold tabular-nums text-ink-2">
                  {formatCount(market.stats.tradersToday)}명
                </b>
              </span>
            </span>
          )}
        </div>
        <div className="mt-3">
          <CandleChart
            candles={chartCandles}
            decimals={chartDecimals}
            currency={ethKrw ? "krw" : "eth"}
          />
        </div>
        <p className="mt-2 text-[11.5px] text-ink-3">
          차트:{" "}
          <a
            href="https://www.tradingview.com/"
            target="_blank"
            rel="noreferrer"
            className="underline decoration-hairline underline-offset-2 hover:text-ink-2"
          >
            TradingView Lightweight Charts
          </a>{" "}
          · 일봉 경계 09:00 KST (업비트 일봉과 동일 기준)
        </p>
      </section>

      <TradeHistory trades={market.trades} symbol={symbol} ethKrw={ethKrw} />
    </>
  );
}
