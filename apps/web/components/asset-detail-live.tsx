import { explorerAddressUrl } from "@giwa/config";
import {
  formatChangeBps,
  formatCount,
  formatEth,
  formatKrw,
  formatKrwCompact,
  shortHex,
  wei,
  weiToDisplayKrw,
} from "@giwa/shared";
import type { WeiAmount } from "@giwa/shared";
import Link from "next/link";
import type { HolderAnalysisWire } from "@/lib/analysis";
import type {
  AssetMarketWire,
  CandleWire,
  HolderGraphWire,
} from "@/lib/indexer";
import type { LiveAssetWire } from "@/lib/onchain";
import { HolderGraph } from "./holder-graph";
import { AssetAvatar } from "./asset-avatar";
import type { ChartCandle } from "./candle-chart";
import { CandleChart } from "./candle-chart";
import { CopyAddress } from "./copy-address";
import { TradeHistory } from "./trade-history";
import { TradePanel } from "./trade-panel";
import { VerifiedBadge } from "./verified-badge";

/**
 * 자산 상세 — 온체인 실데이터 (목데이터 대체, 2026-07-22).
 * 차트·체결 내역은 인덱서(가격 API)에서 온다 (2026-07-23 연결).
 * 인덱서 미연결·데이터 없음이면 자리표시로 폴백 — 그 사실을 화면에 명시한다.
 */

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

function InfoRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-hairline/60 py-3 last:border-0">
      <dt className="shrink-0 text-[12.5px] text-ink-3">{label}</dt>
      <dd className="text-right text-[13px]">{children}</dd>
    </div>
  );
}

/** 분포 지표 카드 — 게이지는 중립색(해석 색 입히지 않음), 산정 기준을 함께 표기 */
function AnalysisMetric({
  label,
  permille,
  desc,
}: {
  label: string;
  permille: number;
  desc: string;
}) {
  const pct = permille / 10;
  return (
    <div className="rounded-lg border border-hairline/60 bg-black/20 p-4">
      <p className="text-[11.5px] text-ink-3">{label}</p>
      <p className="mt-1.5 font-mono text-[22px] font-bold tabular-nums">
        {pct.toFixed(1)}
        <span className="ml-0.5 text-[13px] font-medium text-ink-3">%</span>
      </p>
      <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/5">
        <div
          className="h-full rounded-full bg-ink-3/70"
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
      <p className="mt-2 text-[10.5px] leading-relaxed text-ink-3">{desc}</p>
    </div>
  );
}

const HOLDER_LABEL: Record<
  NonNullable<HolderAnalysisWire["topHolders"][number]["label"]>,
  { text: string; className: string }
> = {
  issuer: {
    text: "발행자",
    className: "border-down/25 bg-down/10 text-down",
  },
  pair: {
    text: "유동성 페어",
    className: "border-hairline bg-white/5 text-ink-3",
  },
};

function ExplorerLink({ address }: { address: `0x${string}` }) {
  return (
    <a
      href={explorerAddressUrl(address)}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 font-mono text-[12.5px] text-ink-2 transition-colors hover:text-accent"
    >
      {shortHex(address, 6, 4)}
      <span aria-hidden className="text-[10px]">↗</span>
    </a>
  );
}

export function AssetDetailLive({
  asset,
  ethKrw: ethKrwRaw,
  market,
  analysis,
  graph,
}: {
  asset: LiveAssetWire;
  ethKrw: string | null;
  market: AssetMarketWire | null;
  analysis: HolderAnalysisWire | null;
  graph: HolderGraphWire | null;
}) {
  const ethKrw = ethKrwRaw ? BigInt(ethKrwRaw) : null;
  const priceWei = wei(BigInt(asset.priceWei)) as WeiAmount;
  const liquidityWei = wei(BigInt(asset.liquidityWei)) as WeiAmount;
  const supply = BigInt(asset.totalSupply) / 10n ** 18n;
  const issuedDate = new Date(asset.issuedAt * 1000);

  const chartCandles = market
    ? toChartCandles(market.candles, market.interval, ethKrw)
    : [];
  const lastClose = chartCandles[chartCandles.length - 1]?.close ?? 0;
  const chartDecimals = ethKrw ? krwDecimals(lastClose) : 8;

  return (
    <div className="mx-auto w-full max-w-[1840px] px-8 pb-4 pt-10">
      <Link
        href="/"
        className="text-[12.5px] text-ink-3 transition-colors hover:text-ink-2"
      >
        ← 자산 목록
      </Link>

      {/* 헤더 */}
      <div className="mt-5 flex flex-wrap items-center gap-4">
        <AssetAvatar symbol={asset.symbol} size={46} />
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-[24px] font-bold tracking-wide">
              {asset.symbol}
            </h1>
            <VerifiedBadge verification={asset.verification} />
            <CopyAddress address={asset.address} />
          </div>
          <p className="mt-0.5 text-[13px] text-ink-3">
            {asset.nameKo} · 발행 {asset.issuerName}
          </p>
        </div>
        <div className="ml-auto text-right">
          {ethKrw ? (
            <>
              <p className="font-mono text-[26px] font-semibold tabular-nums">
                <span className="mr-0.5 text-[18px] text-ink-2">₩</span>
                {formatKrw(weiToDisplayKrw(priceWei, ethKrw))}
              </p>
              <p className="mt-0.5 font-mono text-[12px] tabular-nums text-ink-3">
                {formatEth(priceWei, 8)} ETH
              </p>
            </>
          ) : (
            <p className="font-mono text-[26px] font-semibold tabular-nums">
              {formatEth(priceWei, 8)}{" "}
              <span className="text-[14px] text-ink-3">ETH</span>
            </p>
          )}
        </div>
      </div>

      <div className="mt-8 flex flex-col items-start gap-5 xl:flex-row">
        {/* 좌: 차트·체결 — 인덱서 데이터. 미연결이면 자리표시 폴백 */}
        <div className="w-full min-w-0 flex-1 space-y-4">
          {market ? (
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
                <p className="mt-2 text-[10.5px] text-ink-3">
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

              <TradeHistory
                trades={market.trades}
                symbol={asset.symbol}
                ethKrw={ethKrw}
              />
            </>
          ) : (
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
          )}
        </div>

        {/* 우: 거래 + 온체인 정보 */}
        <aside className="w-full shrink-0 space-y-4 xl:w-[400px]">
          <TradePanel asset={asset} ethKrw={ethKrwRaw} />

          <div className="rounded-xl carved p-6">
            <h2 className="text-[15px] font-semibold">온체인 정보</h2>
            <dl className="mt-3">
              <InfoRow label="예치 규모">
                {ethKrw ? (
                  <span className="font-mono tabular-nums">
                    {formatKrwCompact(weiToDisplayKrw(liquidityWei, ethKrw))}
                    <span className="ml-0.5 text-[11px] text-ink-3">원</span>
                  </span>
                ) : (
                  <span className="font-mono tabular-nums">
                    {formatEth(liquidityWei, 4)}{" "}
                    <span className="text-[11px] text-ink-3">ETH</span>
                  </span>
                )}
              </InfoRow>
              <InfoRow label="총 공급량">
                <span className="font-mono tabular-nums">
                  {supply.toLocaleString("en-US")}
                  <span className="ml-0.5 text-[11px] text-ink-3">
                    개 (고정)
                  </span>
                </span>
              </InfoRow>
              <InfoRow label="상장일">
                <span className="font-mono tabular-nums">
                  {issuedDate.toISOString().slice(0, 10)}
                </span>
              </InfoRow>
              <InfoRow label="토큰 컨트랙트">
                <ExplorerLink address={asset.address} />
              </InfoRow>
              <InfoRow label="유동성 페어">
                <ExplorerLink address={asset.pair} />
              </InfoRow>
            </dl>
          </div>

          <div className="rounded-xl carved p-6">
            <h2 className="text-[15px] font-semibold">신원 검증</h2>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-2">
              <span className="font-medium text-good">
                발행 시점에 검증된 자산입니다.
              </span>{" "}
              발행 게이트가 검증 근거의 지문을 온체인에 영구 기록했습니다.
            </p>
            <dl className="mt-3">
              <InfoRow label="검증 방식">
                <span className="text-good">
                  {asset.verification.label} · 자체 신원 원장(도장 스키마 준거)
                </span>
              </InfoRow>
              <InfoRow label="신원 참조">
                <span className="font-mono text-[12px] text-ink-3">
                  {shortHex(asset.identityRef, 10, 6)}
                </span>
              </InfoRow>
            </dl>
            <p className="mt-3 text-[11px] leading-relaxed text-ink-3">
              테스트넷 데모 — 검증은 나루 운영자 어테스테이션이며,
              도장(Dojang) 정식 연동 시 같은 자리에 실검증이 기록됩니다.{" "}
              <b className="font-medium text-ink-2">
                검증은 사기 필터이며 투자 보증이 아닙니다.
              </b>
            </p>
          </div>
        </aside>
      </div>

      {/* 온체인 분석 v0 — 보유 분포 (명세서 §2.2 부분 선행).
          인사이더·스나이퍼·관계도는 전송 전수 원장(P1) 전제 — 자리표시로 명시 */}
      <section className="mt-5 rounded-xl carved p-5">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h2 className="text-[15px] font-semibold">온체인 분석</h2>
          <span className="text-[11px] text-ink-3">
            보유 분포 · Blockscout 온체인 집계 · 60초 갱신
          </span>
        </div>

        {analysis ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <AnalysisMetric
                label="발행자 물량"
                permille={analysis.issuerPermille}
                desc="발행자 지갑 보유량 ÷ 총공급. 물량 상한·베스팅의 온체인 강제는 심사 인프라 컨트랙트에서 예정"
              />
              <AnalysisMetric
                label="상위 10 집중도"
                permille={analysis.top10Permille}
                desc="상위 10개 지갑 합산 ÷ 총공급 — 인프라 주소(유동성 페어)는 제외한 값"
              />
              <div className="rounded-lg border border-hairline/60 bg-black/20 p-4">
                <p className="text-[11.5px] text-ink-3">홀더</p>
                <p className="mt-1.5 font-mono text-[22px] font-bold tabular-nums">
                  {formatCount(analysis.holderCount)}
                  <span className="ml-1 text-[13px] font-medium text-ink-3">
                    지갑
                  </span>
                </p>
                <p className="mt-2 text-[10.5px] leading-relaxed text-ink-3">
                  토큰을 보유한 지갑 수. 테스트넷 데모라 시드 봇·운영 지갑이
                  포함됩니다
                </p>
              </div>
          </div>
        ) : (
          <p className="mt-3 text-[12.5px] leading-relaxed text-ink-3">
            보유 분포를 불러오지 못했습니다 — 익스플로러(Blockscout) 응답이
            지연될 수 있습니다. 잠시 후 새로고침해 주세요.
          </p>
        )}

        {/* 관계도(전송 원장 기반)와 상위 홀더(Blockscout 기반)는 원천이 달라 독립 분기 */}
        <div className="mt-4 flex flex-col gap-5 xl:flex-row">
          <div className="min-w-0 flex-1 rounded-lg border border-hairline/60 bg-black/20 p-4">
            <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
              <p className="text-[12.5px] font-medium text-ink-2">
                홀더 관계도
              </p>
              <span className="text-[10.5px] text-ink-3">
                {graph && graph.nodes.length > 0
                  ? `상위 ${graph.nodes.length}개 지갑 · 서로 자금을 주고받은 지갑이 선으로 이어집니다`
                  : "전송 원장 기반"}
              </span>
            </div>
            {graph && graph.nodes.length > 0 ? (
              <div className="mt-2">
                <HolderGraph graph={graph} />
              </div>
            ) : (
              <p className="grid h-[220px] place-items-center text-[12.5px] text-ink-3">
                전송 원장 인덱싱 후 표시됩니다 — 인덱서 백필이 진행 중일 수
                있습니다.
              </p>
            )}
          </div>

          {analysis ? (
            <div className="w-full shrink-0 xl:w-[400px]">
              <p className="text-[12.5px] font-medium text-ink-2">상위 홀더</p>
              <table className="mt-2 w-full border-collapse text-[12px]">
                <thead>
                  <tr className="border-b border-black/40 text-[10.5px] tracking-[0.08em] text-ink-3">
                    <th scope="col" className="py-1.5 text-left font-medium">
                      주소
                    </th>
                    <th scope="col" className="py-1.5 text-left font-medium">
                      라벨
                    </th>
                    <th scope="col" className="py-1.5 text-right font-medium">
                      보유
                    </th>
                    <th scope="col" className="py-1.5 text-right font-medium">
                      비중
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {analysis.topHolders.map((h) => (
                    <tr key={h.address} className="border-b border-black/25 last:border-0">
                      <td className="py-1.5">
                        <ExplorerLink address={h.address} />
                      </td>
                      <td className="py-1.5">
                        {h.label ? (
                          <span
                            className={`rounded border px-1.5 py-[1.5px] text-[10px] font-medium ${HOLDER_LABEL[h.label].className}`}
                          >
                            {HOLDER_LABEL[h.label].text}
                          </span>
                        ) : (
                          <span className="text-ink-3">—</span>
                        )}
                      </td>
                      <td className="py-1.5 text-right font-mono tabular-nums text-ink-2">
                        {formatEth(wei(BigInt(h.balance)), 0)}
                      </td>
                      <td className="py-1.5 text-right font-mono tabular-nums">
                        {(h.permille / 10).toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>

        <p className="mt-4 border-t border-hairline/40 pt-3 text-[11px] leading-relaxed text-ink-3">
          · 관계도의 클러스터는 직접 전송으로 이어진 연결 성분입니다 — 중간
          지갑을 거친 간접 연결도 같은 클러스터로 묶이며, 라우터·페어 같은
          인프라 주소 경유는 연결로 치지 않습니다.
          <br />· 인사이더 비중 · 스나이퍼 비중은 취득 이력 산식 연결 후
          제공됩니다 — 추정치로 채우지 않습니다.
          <br />· 수치는 산정 기준에 따라 달라지므로 각 지표에 기준을 함께
          표기합니다. 발행자·팀 지갑 라벨은 심사에서 등록된 주소 기준입니다.
        </p>
      </section>
    </div>
  );
}
