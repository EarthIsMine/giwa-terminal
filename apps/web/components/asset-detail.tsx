"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  STAT_WINDOWS,
  STAT_WINDOW_LABEL,
  formatChangeBps,
  formatCount,
  formatEth,
  formatKrw,
  formatKrwCompact,
  wei,
  weiToDisplayKrw,
} from "@giwa/shared";
import type { StatWindow, VerifiedAsset, WeiAmount } from "@giwa/shared";
import { explorerAddressUrl, giwaChain } from "@giwa/config";
import { MOCK_ETH_KRW, SEED_ASSETS } from "@/lib/seed-data";
import {
  asKrwNumber,
  generateCandles,
  generateTrades,
  poolAddress,
  priceDecimals,
} from "@/lib/seed-detail";
import { AssetAvatar } from "./asset-avatar";
import { AssetLinksIcons } from "./asset-links";
import { CandleChart } from "./candle-chart";
import { CopyAddress } from "./copy-address";
import { VerifiedBadge } from "./verified-badge";

/* ---------- 표시 유틸 ---------- */

function krw(v: WeiAmount): string {
  return formatKrw(weiToDisplayKrw(v, MOCK_ETH_KRW));
}

function krwCompactParts(v: WeiAmount): { num: string; unit: string | undefined } {
  const s = formatKrwCompact(weiToDisplayKrw(v, MOCK_ETH_KRW));
  const m = /^([\d,.]+)(억|만)?$/.exec(s);
  return { num: m?.[1] ?? s, unit: m?.[2] };
}

function changeColor(bps: number): string {
  return bps > 0 ? "text-up" : bps < 0 ? "text-down" : "text-ink-3";
}

function shortAddress(a: string): string {
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

/** 표시는 항상 내림 — 과대 표시 금지 (지표 정의). 체결 표는 float라 여기서 절사한다 */
function floorTo(v: number, d: number): number {
  const f = 10 ** d;
  return Math.floor(v * f) / f;
}

function fmtFloatKrw(v: number, decimals = 0): string {
  return floorTo(v, decimals).toLocaleString("ko-KR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function fmtTokens(t: number): string {
  const d = t >= 100 ? 0 : t >= 1 ? 2 : 4;
  return floorTo(t, d).toLocaleString("ko-KR", { maximumFractionDigits: d });
}

/* ---------- 사이드바 조각 ---------- */

function StatTile({
  label,
  num,
  unit,
  sub,
  valueClass,
}: {
  label: string;
  num: string;
  unit?: string;
  sub?: string;
  valueClass?: string;
}) {
  return (
    <div className="rounded-xl carved px-4 py-3.5">
      <p className="text-[10.5px] font-medium tracking-[0.1em] text-ink-3">
        {label}
      </p>
      <p
        className={`mt-1.5 font-mono text-[17px] font-semibold leading-none tabular-nums ${valueClass ?? ""}`}
      >
        {num}
        {unit ? (
          <span className="ml-0.5 font-sans text-[12px] font-normal text-ink-3">
            {unit}
          </span>
        ) : null}
      </p>
      {sub ? <p className="mt-1.5 text-[10px] text-ink-3">{sub}</p> : null}
    </div>
  );
}

type ChartRange = "1m" | "3m" | "all";

const RANGE_LABEL: Record<ChartRange, string> = {
  "1m": "1개월",
  "3m": "3개월",
  all: "전체",
};

const RANGE_DAYS: Record<ChartRange, number> = { "1m": 30, "3m": 90, all: 0 };

/* ---------- 본체 ---------- */

export function AssetDetail({ address }: { address: string }) {
  const asset = useMemo(
    () =>
      SEED_ASSETS.find(
        (a) => a.address.toLowerCase() === address.toLowerCase(),
      ),
    [address],
  );
  const [range, setRange] = useState<ChartRange>("3m");

  const candles = useMemo(
    () => (asset ? generateCandles(asset) : []),
    [asset],
  );
  const trades = useMemo(() => (asset ? generateTrades(asset) : []), [asset]);

  if (!asset) return null;

  const days = RANGE_DAYS[range];
  const visibleCandles = days > 0 ? candles.slice(-days) : candles;
  const decimals = priceDecimals(asKrwNumber(asset.priceWei));
  const todayBps = asset.stats.today.changeBps;

  const buys = trades.filter((t) => t.side === "buy").length;
  const sells = trades.length - buys;

  // 시가총액 = totalSupply × price (데모 시드: 소각·락업 없음, 전량 포함)
  const marketCapWei = wei(
    (asset.totalSupply * (asset.priceWei as bigint)) / 10n ** 18n,
  );
  // 풀 보유 기준 자산 = 예치 규모 / 2 (V2 정의의 역산)
  const poolQuoteWei = wei((asset.liquidityWei as bigint) / 2n);
  const pool = poolAddress(asset);

  const mcap = krwCompactParts(marketCapWei);
  const liq = krwCompactParts(asset.liquidityWei);
  const vol = krwCompactParts(asset.stats.today.volumeWei);

  return (
    <div className="mx-auto w-full max-w-[1840px] px-8 pb-4 pt-6">
      {/* 상단 스트립 */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-4">
        <Link
          href="/"
          aria-label="자산 목록으로 돌아가기"
          className="grid size-10 shrink-0 place-items-center rounded-lg border border-hairline text-ink-2 transition-colors hover:bg-panel-2 hover:text-ink"
        >
          <svg
            viewBox="0 0 16 16"
            width={16}
            height={16}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M10 3.5L5.5 8l4.5 4.5" />
          </svg>
        </Link>

        <div className="flex items-center gap-3.5">
          <AssetAvatar asset={asset} size={44} />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-[22px] font-bold tracking-wide">
                {asset.symbol}
              </h1>
              <span className="text-[15px] text-ink-3">/ {asset.nameKo}</span>
              <VerifiedBadge verification={asset.verification} />
              {asset.isQuoteAnchor ? (
                <span className="rounded-md border border-hairline px-1.5 py-0.5 text-[10.5px] text-ink-3">
                  기준 자산
                </span>
              ) : null}
            </div>
            <div className="mt-1 flex items-center gap-1.5 font-mono text-[12px] text-ink-3">
              {shortAddress(asset.address)}
              <CopyAddress address={asset.address} />
              <a
                href={explorerAddressUrl(asset.address)}
                target="_blank"
                rel="noreferrer"
                title="익스플로러에서 보기"
                className="text-ink-3 transition-colors hover:text-ink-2"
              >
                ↗
              </a>
              <span className="mx-0.5 h-3 w-px bg-hairline" aria-hidden />
              <AssetLinksIcons links={asset.links} size={13} />
            </div>
          </div>
        </div>

        <div className="ml-auto text-right">
          <p className="font-mono text-[26px] font-semibold leading-none tabular-nums">
            <span className="mr-0.5 text-[18px] text-ink-2">₩</span>
            {krw(asset.priceWei)}
          </p>
          <p className="mt-1.5 font-mono text-[12.5px] tabular-nums text-ink-3">
            {formatEth(asset.priceWei, 8)} ETH ·{" "}
            <span className={changeColor(todayBps)}>
              오늘 {formatChangeBps(todayBps)}
            </span>
          </p>
        </div>
      </div>

      {/* 본문: 좌 차트+체결 / 우 사이드바 */}
      <div className="mt-6 flex flex-col items-start gap-5 xl:flex-row">
        <div className="w-full min-w-0 flex-1">
          {/* 차트 카드 */}
          <div className="rounded-xl carved">
            <div className="flex flex-wrap items-center gap-3 border-b border-hairline/60 px-4 py-3">
              <div
                role="group"
                aria-label="차트 기간"
                className="inline-flex rounded-lg border border-hairline bg-panel p-0.5"
              >
                {(Object.keys(RANGE_LABEL) as ChartRange[]).map((r) => (
                  <button
                    key={r}
                    type="button"
                    aria-pressed={range === r}
                    onClick={() => setRange(r)}
                    className={`rounded-md px-3 py-1 text-[12px] transition-colors ${
                      range === r
                        ? "border border-accent/25 bg-accent/15 font-medium text-ink"
                        : "border border-transparent text-ink-3 hover:text-ink-2"
                    }`}
                  >
                    {RANGE_LABEL[r]}
                  </button>
                ))}
              </div>
              <span className="ml-auto rounded-md border border-hairline px-2 py-1 text-[11px] text-ink-3">
                일봉 · 업비트 시세 환산
              </span>
            </div>
            <div className="p-2">
              <CandleChart candles={visibleCandles} decimals={decimals} />
            </div>
          </div>

          {/* 풀 정보 스트립 */}
          <div className="mt-4 flex flex-wrap items-center gap-x-8 gap-y-2 rounded-xl carved px-5 py-3.5 text-[12.5px] text-ink-2">
            {asset.isQuoteAnchor ? (
              <span className="text-ink-3">
                기준 자산 — 모든 자산 가격의 분모입니다
              </span>
            ) : (
              <span>
                페어{" "}
                <span className="font-mono text-ink">
                  {asset.symbol}/WETH
                </span>
              </span>
            )}
            <span className="flex items-center gap-1.5">
              풀 주소{" "}
              <span className="font-mono text-ink-2">
                {shortAddress(pool)}
              </span>
              <CopyAddress address={pool} />
            </span>
            <span>
              풀 보유{" "}
              <span className="font-mono text-ink">
                {formatEth(poolQuoteWei, 2)} WETH
              </span>
            </span>
            <a
              href={giwaChain.explorerUrl}
              target="_blank"
              rel="noreferrer"
              className="ml-auto text-ink-3 transition-colors hover:text-ink-2"
            >
              익스플로러 ↗
            </a>
          </div>

          {/* 체결 내역 */}
          <div className="mt-4 overflow-hidden rounded-xl carved">
            <div className="flex items-center gap-2.5 border-b border-hairline/60 px-5 py-3.5">
              <h2 className="text-[13.5px] font-semibold">체결 내역</h2>
              <span className="rounded border border-warn/25 bg-warn/10 px-1.5 py-px text-[10px] text-warn">
                데모 시드
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse text-left">
                <caption className="sr-only">
                  {asset.nameKo} 최근 체결 내역
                </caption>
                <thead>
                  <tr className="border-b border-black/35 bg-black/15 text-[11px] font-medium tracking-[0.1em] text-ink-3">
                    <th scope="col" className="px-5 py-2.5">시간</th>
                    <th scope="col" className="px-5 py-2.5">구분</th>
                    <th scope="col" className="px-5 py-2.5 text-right">체결가</th>
                    <th scope="col" className="px-5 py-2.5 text-right">
                      수량 ({asset.symbol})
                    </th>
                    <th scope="col" className="px-5 py-2.5 text-right">금액</th>
                    <th scope="col" className="px-5 py-2.5 text-right">Tx</th>
                  </tr>
                </thead>
                <tbody>
                  {trades.map((t) => (
                    <tr
                      key={t.txHash}
                      className="border-b border-black/20 text-[13px] transition-colors last:border-0 hover:bg-panel-2/50"
                    >
                      <td className="px-5 py-3 text-ink-3">{t.agoLabel}</td>
                      <td
                        className={`px-5 py-3 font-medium ${t.side === "buy" ? "text-up" : "text-down"}`}
                      >
                        {t.side === "buy" ? "매수" : "매도"}
                      </td>
                      <td className="px-5 py-3 text-right font-mono tabular-nums">
                        ₩{fmtFloatKrw(t.priceKrw, decimals)}
                      </td>
                      <td className="px-5 py-3 text-right font-mono tabular-nums text-ink-2">
                        {fmtTokens(t.tokens)}
                      </td>
                      <td className="px-5 py-3 text-right font-mono tabular-nums">
                        ₩{fmtFloatKrw(t.valueKrw)}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <a
                          href={`${giwaChain.explorerUrl}/tx/${t.txHash}`}
                          target="_blank"
                          rel="noreferrer"
                          className="font-mono text-[12px] text-ink-3 transition-colors hover:text-ink-2"
                        >
                          {t.txHash.slice(0, 6)}…{t.txHash.slice(-4)} ↗
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-3 space-y-1 text-[12px] leading-relaxed text-ink-3">
            <p>
              · 차트와 체결 내역의 원화 금액은 업비트 KRW-ETH 시세(₩
              {formatCount(Number(MOCK_ETH_KRW))} · 데모 고정값)로 환산한
              참고값입니다. 원화 자산이 온체인에 존재하는 것은 아닙니다.
            </p>
            <p>
              · 차트:{" "}
              <a
                href="https://www.tradingview.com"
                target="_blank"
                rel="noreferrer"
                className="transition-colors hover:text-ink-2"
              >
                TradingView Lightweight Charts™
              </a>
            </p>
          </div>
        </div>

        {/* 사이드바 */}
        <aside className="w-full shrink-0 space-y-4 xl:w-[380px]">
          <div className="grid grid-cols-3 gap-2.5">
            <StatTile label="현재가" num={krw(asset.priceWei)} unit="원" />
            <StatTile label="예치 규모" num={liq.num} unit={liq.unit} />
            <StatTile
              label="시가총액"
              num={mcap.num}
              unit={mcap.unit}
              sub="환산 참고값"
            />
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            {STAT_WINDOWS.map((w: StatWindow) => {
              const bps = asset.stats[w].changeBps;
              return (
                <StatTile
                  key={w}
                  label={`${STAT_WINDOW_LABEL[w]} 변동`}
                  num={formatChangeBps(bps)}
                  valueClass={changeColor(bps)}
                />
              );
            })}
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <StatTile
              label="오늘 거래대금"
              num={vol.num}
              unit={vol.unit}
              sub="업비트 시세 환산"
            />
            <StatTile
              label="오늘 참여 인원"
              num={formatCount(asset.stats.today.traders)}
              unit="명"
            />
          </div>

          {/* 매수/매도 흐름 */}
          <div className="rounded-xl carved px-4 py-3.5">
            <div className="flex items-center justify-between text-[12px]">
              <span className="font-medium text-up">매수 {buys}</span>
              <span className="text-[10.5px] tracking-[0.1em] text-ink-3">
                최근 체결
              </span>
              <span className="font-medium text-down">매도 {sells}</span>
            </div>
            <div className="mt-2.5 flex h-1.5 gap-[2px] overflow-hidden rounded-full">
              <div className="rounded-l-full bg-up" style={{ flexGrow: buys }} />
              <div
                className="rounded-r-full bg-down"
                style={{ flexGrow: sells }}
              />
            </div>
          </div>

          {/* 신원 검증 — 이 터미널의 1급 시민 (절대 규칙 6) */}
          <div className="rounded-xl border border-good/20 bg-good/[0.05] px-5 py-4.5">
            <div className="flex items-center gap-2">
              <svg
                viewBox="0 0 16 16"
                width={16}
                height={16}
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
                className="text-good"
              >
                <path d="M8 1.5l5 1.8v3.6c0 3.3-2.1 5.7-5 7-2.9-1.3-5-3.7-5-7V3.3L8 1.5z" />
                <path d="M5.8 7.9l1.6 1.6 2.8-3.1" />
              </svg>
              <h2 className="text-[13.5px] font-semibold">신원 검증 완료</h2>
              <span className="ml-auto rounded-md border border-good/25 bg-good/10 px-1.5 py-0.5 text-[10.5px] font-medium text-good">
                {asset.verification.label}
              </span>
            </div>
            <p className="mt-2.5 text-[12.5px] leading-relaxed text-ink-2">
              이 자산은{" "}
              {asset.verification.method === "dojang"
                ? "도장(Dojang) 어테스테이션"
                : "GIWA ID 신원 연동"}
              을 통과해 목록에 표시됩니다. 나루는 검증된 자산만 다룹니다.
            </p>
            <div className="mt-3 flex items-center gap-1.5 border-t border-good/15 pt-3 font-mono text-[12px] text-ink-3">
              컨트랙트 {shortAddress(asset.address)}
              <CopyAddress address={asset.address} />
              <a
                href={explorerAddressUrl(asset.address)}
                target="_blank"
                rel="noreferrer"
                className="ml-auto font-sans text-[12px] text-ink-3 transition-colors hover:text-ink-2"
              >
                익스플로러에서 확인 ↗
              </a>
            </div>
          </div>

          {/* 거래 — 준비 중 (지갑 연결을 강요하지 않는다) */}
          <div className="rounded-xl carved px-5 py-4.5">
            <div className="flex items-center gap-2">
              <h2 className="text-[13.5px] font-semibold">거래</h2>
              <span className="rounded border border-hairline px-1.5 py-px text-[10px] text-ink-3">
                준비 중
              </span>
            </div>
            <p className="mt-2 text-[12.5px] leading-relaxed text-ink-3">
              거래 기능은 준비 중입니다. 이메일로 시작해 두면 오픈 소식을 가장
              먼저 알려드립니다.
            </p>
            <button
              type="button"
              className="mt-3.5 w-full rounded-lg bg-accent py-2.5 text-[13px] font-semibold text-accent-ink transition-[filter] hover:brightness-110"
            >
              이메일로 시작
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
