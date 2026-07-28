import {
  formatChangeBps,
  formatCount,
  formatEth,
  formatKrwCompact,
  wei,
  weiToDisplayKrw,
} from "@giwa/shared";
import type { AssetMarketWire } from "@/lib/indexer";
import { AssetChartPanel } from "@/components/asset/asset-chart-panel";
import { TradeHistory } from "@/components/asset/trade-history";

/** 차트·체결 섹션 — 인덱서 데이터. 미연결·데이터 없음이면 자리표시 폴백.
 *  기간 전환·캔들 변환은 클라이언트 패널(AssetChartPanel) 몫이다 */
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

  return (
    <>
      <section className="rounded-xl carved p-5">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h2 className="text-[15px] font-semibold">가격 차트</h2>
          <span className="text-[11px] text-ink-3">
            {ethKrw ? "원화 환산(업비트 KRW-ETH 시세)" : "ETH 표시"} · 테스트넷
            시드 데이터
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
        <AssetChartPanel
          series={market.series}
          ethKrw={ethKrw?.toString() ?? null}
        />
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
