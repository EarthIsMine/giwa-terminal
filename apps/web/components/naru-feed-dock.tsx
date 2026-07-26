"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { giwaChain } from "@giwa/config";
import {
  formatChangeBps,
  formatEth,
  formatKrw,
  formatKrwCompact,
  wei,
  weiToDisplayKrw,
} from "@giwa/shared";
import type { DisplayKrw } from "@giwa/shared";
import type { FeedItemWire } from "@/lib/indexer";
import type { MarketTickerWire } from "@/lib/krw";
import { GuideOverlay } from "./guide-overlay";

/**
 * 나루터 소식 도크 v0 — 화면 하단 고정 바 + 접이식 패널 (GMGN식 하단 도크 참고).
 * 접힌 상태가 기본(절대 규칙 3: 밀도를 낮춘다), 접힌 바에는 최신 소식 1줄만 흐른다.
 * 문구는 사실 서술만 — 해석·경고성 표현 금지. 발행자 매도는 금액 무관 무조건 노출.
 * 열림 상태는 React state 로만 유지한다 (브라우저 스토리지 금지 규칙).
 */

interface FeedResponse {
  items: FeedItemWire[] | null;
  ethKrw: string | null;
  tickers: MarketTickerWire[];
  usdKrwCents: number | null;
  kimchiBps: number | null;
}

/**
 * 업비트 주요 원화 시세 — 업저씨의 기준점을 상시 띄운다.
 * 나루 화면의 원화는 "환산 참고값"이지만 이건 거래소 실제 체결가라
 * 출처(업비트)를 라벨로 붙여 구분한다.
 */
function TickerStrip({
  tickers,
  usdKrwCents,
  kimchiBps,
}: {
  tickers: MarketTickerWire[];
  usdKrwCents: number | null;
  kimchiBps: number | null;
}) {
  if (tickers.length === 0) return null;
  // 폭이 좁으면 뒤쪽(USDT)부터 접는다 — 앞의 셋이 기준점 역할을 한다
  const primary = tickers.filter((t) => t.symbol !== "USDT");
  const usdt = tickers.find((t) => t.symbol === "USDT");
  return (
    <div className="hidden shrink-0 items-center gap-3 border-l border-hairline pl-3 text-[11.5px] xl:flex">
      <span className="text-ink-3">업비트</span>
      {primary.map((t) => (
        <span key={t.symbol} className="flex items-baseline gap-1.5">
          <span className="font-medium text-ink-2">{t.symbol}</span>
          {/* 실제 체결가라 축약하지 않는다 (업비트 표기와 같은 감각) */}
          <span className="font-mono tabular-nums text-ink-2">
            {formatKrw(BigInt(t.krw) as DisplayKrw)}
          </span>
          <span
            className={`font-mono tabular-nums ${t.changeBps >= 0 ? "text-up" : "text-down"}`}
          >
            {formatChangeBps(t.changeBps)}
          </span>
        </span>
      ))}

      {usdt ? (
        <span className="hidden items-baseline gap-1.5 2xl:flex">
          <span className="font-medium text-ink-2">USDT</span>
          <span className="font-mono tabular-nums text-ink-2">
            {formatKrw(BigInt(usdt.krw) as DisplayKrw)}
          </span>
          <span
            className={`font-mono tabular-nums ${usdt.changeBps >= 0 ? "text-up" : "text-down"}`}
          >
            {formatChangeBps(usdt.changeBps)}
          </span>
        </span>
      ) : null}

      {usdKrwCents !== null ? (
        <span
          className="hidden items-baseline gap-1.5 border-l border-hairline pl-3 2xl:flex"
          title="USD/KRW 매매기준율 (영업일 기준)"
        >
          <span className="text-ink-3">환율</span>
          <span className="font-mono tabular-nums text-ink-2">
            {(usdKrwCents / 100).toLocaleString("ko-KR", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
        </span>
      ) : null}

      {kimchiBps !== null ? (
        <span
          className="hidden items-baseline gap-1.5 2xl:flex"
          title="김치 프리미엄 — 업비트 BTC 원화가와 해외 시세×환율의 차이"
        >
          <span className="text-ink-3">김프</span>
          <span
            className={`font-mono tabular-nums ${kimchiBps >= 0 ? "text-up" : "text-down"}`}
          >
            {formatChangeBps(kimchiBps)}
          </span>
        </span>
      ) : null}
    </div>
  );
}

/** 색은 라벨과 같이 side 로 갈린다 — 매도를 상승색으로 칠하면 색만 보는 사람이 반대로 읽는다 */
const TAG: Record<
  FeedItemWire["type"],
  {
    label: (side?: "buy" | "sell") => string;
    className: (side?: "buy" | "sell") => string;
  }
> = {
  listed: {
    label: () => "신규 상장",
    className: () => "bg-accent/15 text-accent",
  },
  issuer_sell: {
    label: () => "발행자 매도",
    className: () => "bg-down/15 text-down",
  },
  large_trade: {
    label: (side) => (side === "buy" ? "대형 매수" : "대형 매도"),
    className: (side) =>
      side === "buy" ? "bg-up/15 text-up" : "bg-down/15 text-down",
  },
};

function relativeTime(ts: number): string {
  const diff = Math.max(0, Math.floor(Date.now() / 1_000) - ts);
  if (diff < 60) return "방금 전";
  if (diff < 3_600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86_400) return `${Math.floor(diff / 3_600)}시간 전`;
  return `${Math.floor(diff / 86_400)}일 전`;
}

function amountText(wethAmount: string, ethKrw: bigint | null): string {
  const v = wei(BigInt(wethAmount));
  return ethKrw
    ? `${formatKrwCompact(weiToDisplayKrw(v, ethKrw))}원`
    : `${formatEth(v, 5)} ETH`;
}

/** 접힌 바 티커용 한 줄 요약 (링크 없는 순수 텍스트) */
function previewText(item: FeedItemWire, ethKrw: bigint | null): string {
  const amount = item.wethAmount ? ` ${amountText(item.wethAmount, ethKrw)}` : "";
  if (item.type === "listed") return `${item.symbol} 검증 완료 · 거래 개시`;
  if (item.type === "issuer_sell") return `${item.symbol} 발행자 지갑 매도${amount}`;
  return `${item.symbol} ${item.side === "buy" ? "매수" : "매도"}${amount} 체결`;
}

function ItemBody({
  item,
  ethKrw,
}: {
  item: FeedItemWire;
  ethKrw: bigint | null;
}) {
  const symbol = (
    <Link
      href={`/asset/${item.token}`}
      className="font-semibold text-ink transition-colors hover:text-accent"
    >
      {item.symbol}
    </Link>
  );
  if (item.type === "listed") {
    return <>{symbol} 검증 완료 · 거래 개시. 발행 게이트에서 공급 고정을 확인했습니다</>;
  }
  const amount = item.wethAmount ? (
    <b className="font-semibold text-ink">{amountText(item.wethAmount, ethKrw)}</b>
  ) : null;
  const pct =
    item.poolPermille !== undefined
      ? ` · 풀 유동성의 ${(item.poolPermille / 10).toFixed(1)}%`
      : "";
  if (item.type === "issuer_sell") {
    return (
      <>
        {symbol} 발행자 지갑 매도 {amount}
        {pct}. 금액과 무관하게 노출되는 항목입니다
      </>
    );
  }
  return (
    <>
      {symbol} {item.side === "buy" ? "매수" : "매도"} {amount} 체결
      {pct}
    </>
  );
}

export function NaruFeedDock() {
  const pathname = usePathname();
  const [items, setItems] = useState<FeedItemWire[]>([]);
  const [ethKrwRaw, setEthKrwRaw] = useState<string | null>(null);
  const [tickers, setTickers] = useState<MarketTickerWire[]>([]);
  const [usdKrwCents, setUsdKrwCents] = useState<number | null>(null);
  const [kimchiBps, setKimchiBps] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch("/api/feed");
        if (!res.ok) return;
        const data = (await res.json()) as FeedResponse;
        if (cancelled) return;
        if (data.items && data.items.length > 0) {
          setItems(data.items);
          setEthKrwRaw(data.ethKrw);
        }
        // 시세는 인덱서와 무관한 외부 소스 — 소식이 없어도 표시한다
        setTickers(data.tickers ?? []);
        setUsdKrwCents(data.usdKrwCents ?? null);
        setKimchiBps(data.kimchiBps ?? null);
      } catch {
        /* 소식·시세 모두 조용히 폴백 (바는 유지) */
      }
    };
    void load();
    const timer = setInterval(load, 60_000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  // 드로어가 열려 있는 동안 ESC 로 닫는다 (오버레이 관례)
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // 기술 문서는 독립 문서 화면 — 터미널 도크를 얹지 않는다
  if (pathname?.startsWith("/docs")) return null;

  const ethKrw = ethKrwRaw ? BigInt(ethKrwRaw) : null;
  const latest = items[0] ?? null;

  return (
    <>
      {/* 고정 바 높이만큼 본문 끝을 밀어 푸터 마지막 줄이 가려지지 않게 한다 */}
      <div aria-hidden className="h-10" />

      {/* 소식 드로어 — 우측에서 슬라이드해 들어온다. 닫힘 상태에서도 마운트를 유지해
          transform 트랜지션이 살아 있게 하고, 대신 포인터 이벤트를 끈다 */}
      <div
        className={`fixed inset-0 z-40 ${open ? "" : "pointer-events-none"}`}
        aria-hidden={!open}
      >
        <button
          type="button"
          tabIndex={open ? 0 : -1}
          aria-label="나루터 소식 닫기"
          onClick={() => setOpen(false)}
          className={`absolute inset-0 cursor-default bg-black/50 backdrop-blur-[2px] transition-opacity duration-300 ${
            open ? "opacity-100" : "opacity-0"
          }`}
        />
        <aside
          aria-label="나루터 소식 목록"
          className={`absolute right-0 top-0 flex h-full w-[30%] min-w-[380px] max-w-[560px] flex-col border-l border-hairline bg-[#160e07]/97 shadow-[-24px_0_80px_rgba(0,0,0,0.5)] backdrop-blur-md transition-transform duration-300 ease-out ${
            open ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="flex items-start justify-between border-b border-black/40 px-6 py-5">
            <div>
              <h2 className="flex items-center gap-2 text-[16px] font-semibold">
                <span
                  aria-hidden
                  className="size-1.5 rounded-full bg-good animate-pulse-dot"
                />
                나루터 소식
              </h2>
              <p className="mt-1 text-[11.5px] leading-relaxed text-ink-3">
                중대형 체결 · 유동성 변동 · 신규 상장
              </p>
            </div>
            <button
              type="button"
              tabIndex={open ? 0 : -1}
              aria-label="닫기"
              onClick={() => setOpen(false)}
              className="grid size-8 shrink-0 place-items-center rounded-lg border border-hairline text-ink-3 transition-colors hover:border-ink-3/40 hover:text-ink-2"
            >
              <svg
                viewBox="0 0 12 12"
                width={11}
                height={11}
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                aria-hidden
              >
                <path d="M2 2l8 8M10 2l-8 8" />
              </svg>
            </button>
          </div>

          <ul className="min-h-0 flex-1 overflow-y-auto px-6">
            {items.map((item) => (
              <li
                key={item.id}
                className="border-b border-black/30 py-3 text-[12.5px] leading-relaxed last:border-0"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`shrink-0 rounded px-1.5 py-[2px] text-[11px] font-semibold ${TAG[item.type].className(item.side)}`}
                  >
                    {TAG[item.type].label(item.side)}
                  </span>
                  <span className="ml-auto flex shrink-0 items-center gap-2 font-mono text-[11.5px] text-ink-3">
                    {item.txHash ? (
                      <a
                        href={`${giwaChain.explorerUrl}/tx/${item.txHash}`}
                        target="_blank"
                        rel="noreferrer"
                        className="transition-colors hover:text-accent"
                        title="익스플로러에서 트랜잭션 보기"
                      >
                        tx ↗
                      </a>
                    ) : null}
                    {relativeTime(item.timestamp)}
                  </span>
                </div>
                <p className="mt-1.5 text-ink-2">
                  <ItemBody item={item} ethKrw={ethKrw} />
                </p>
              </li>
            ))}
          </ul>

          <p className="border-t border-black/40 px-6 py-4 text-[11px] leading-relaxed text-ink-3">
            테스트넷 시드 데이터입니다. 사실 서술만 제공하며 투자 권유가
            아닙니다.
          </p>
        </aside>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30">
        {/* 하단 바 — 좌측은 소식 토글, 우측은 온보딩 가이드 상주 링크 */}
        <div className="border-t border-hairline bg-base/90 backdrop-blur-md">
          {/* 바는 뷰포트 전폭을 쓴다 — 우측 끝까지 시세를 붙이고 도움말은 딱 맞게 */}
          <div className="flex h-10 w-full items-center gap-3 pl-8 pr-3">
            <button
              type="button"
              aria-expanded={open}
              aria-label={open ? "나루터 소식 접기" : "나루터 소식 펼치기"}
              onClick={() => items.length > 0 && setOpen((v) => !v)}
              className="flex h-full min-w-0 flex-1 items-center gap-3 text-left transition-colors hover:bg-white/[0.03]"
            >
              <span className="flex shrink-0 items-center gap-2 text-[12px] font-semibold text-ink-2">
                <span
                  aria-hidden
                  className="size-1.5 rounded-full bg-good animate-pulse-dot"
                />
                나루터 소식
              </span>
              {!open && latest ? (
                <span className="flex min-w-0 items-center gap-2 text-[12px] text-ink-3">
                  <span
                    className={`shrink-0 rounded px-1.5 py-[1.5px] text-[11px] font-semibold ${TAG[latest.type].className(latest.side)}`}
                  >
                    {TAG[latest.type].label(latest.side)}
                  </span>
                  <span className="truncate">
                    {previewText(latest, ethKrw)}
                  </span>
                  <span className="shrink-0 font-mono text-[11.5px]">
                    {relativeTime(latest.timestamp)}
                  </span>
                </span>
              ) : null}
              {items.length > 0 ? (
                <span
                  aria-hidden
                  className="ml-auto shrink-0 text-[11px] text-ink-3"
                >
                  전체 보기 ›
                </span>
              ) : (
                <span className="ml-auto shrink-0 text-[11px] text-ink-3">
                  준비 중
                </span>
              )}
            </button>
            {/* 업비트 주요 시세 — 업저씨의 기준점 */}
            <TickerStrip
              tickers={tickers}
              usdKrwCents={usdKrwCents}
              kimchiBps={kimchiBps}
            />

            {/* 온보딩 가이드 — 물음표 아이콘 하나로 (문구 없이 직관적으로) */}
            <span aria-hidden className="h-4 w-px shrink-0 bg-hairline" />
            <button
              type="button"
              onClick={() => setGuideOpen(true)}
              aria-label="온보딩 가이드 열기"
              title="처음이신가요? 온보딩 가이드"
              className="grid size-6 shrink-0 place-items-center rounded-full border border-ink-3/50 text-[11px] font-semibold leading-none text-ink-3 transition-colors hover:border-accent hover:text-accent"
            >
              ?
            </button>
          </div>
        </div>

        <GuideOverlay open={guideOpen} onClose={() => setGuideOpen(false)} />
      </div>
    </>
  );
}
