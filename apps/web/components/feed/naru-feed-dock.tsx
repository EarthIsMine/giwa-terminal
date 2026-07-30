"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { formatChangeBps, formatKrw } from "@giwa/shared";
import type { DisplayKrw } from "@giwa/shared";
import type { FeedResponse } from "@/lib/api-types";
import type { FeedItemWire } from "@/lib/indexer";
import type { MarketTickerWire } from "@/lib/krw";
import { useEscapeKey } from "@/hooks/use-escape-key";
import { usePoll } from "@/hooks/use-poll";
import { GuideOverlay } from "@/components/guide/guide-overlay";
import { NaruFeedDrawer } from "@/components/feed/naru-feed-drawer";
import { previewText, relativeTime, TAG } from "@/components/feed/naru-feed-item";

/**
 * 나루터 소식 도크 v0 — 화면 하단 고정 바 + 접이식 패널 (GMGN식 하단 도크 참고).
 * 접힌 상태가 기본(절대 규칙 3: 밀도를 낮춘다), 접힌 바에는 최신 소식 1줄만 흐른다.
 * 문구는 사실 서술만 — 해석·경고성 표현 금지. 발행자 매도는 금액 무관 무조건 노출.
 * 열림 상태는 React state 로만 유지한다 (브라우저 스토리지 금지 규칙).
 */

/**
 * 업비트 주요 원화 시세 — 업저씨의 기준점을 상시 띄운다.
 * 나루 화면의 원화는 "환산 참고값"이지만 이건 거래소 실제 체결가라
 * 출처(업비트)를 라벨로 붙여 구분한다.
 */
function TickerStrip({ tickers }: { tickers: MarketTickerWire[] }) {
  if (tickers.length === 0) return null;
  return (
    <div className="hidden shrink-0 items-center gap-3 border-l border-hairline pl-3 text-[11.5px] xl:flex">
      <span className="text-ink-3">업비트</span>
      {tickers.map((t) => (
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
    </div>
  );
}

export function NaruFeedDock() {
  const pathname = usePathname();
  const [items, setItems] = useState<FeedItemWire[]>([]);
  const [ethKrwRaw, setEthKrwRaw] = useState<string | null>(null);
  const [tickers, setTickers] = useState<MarketTickerWire[]>([]);
  const [open, setOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);

  usePoll(async (isCancelled) => {
    try {
      const res = await fetch("/api/feed");
      if (!res.ok) return;
      const data = (await res.json()) as FeedResponse;
      if (isCancelled()) return;
      if (data.items && data.items.length > 0) {
        setItems(data.items);
        setEthKrwRaw(data.ethKrw);
      }
      // 시세는 인덱서와 무관한 외부 소스 — 소식이 없어도 표시한다
      setTickers(data.tickers ?? []);
    } catch {
      /* 소식·시세 모두 조용히 폴백 (바는 유지) */
    }
  }, 60_000);

  // 드로어가 열려 있는 동안 ESC 로 닫는다 (오버레이 관례)
  useEscapeKey(open, () => setOpen(false));

  // 기술 문서는 독립 문서 화면 — 터미널 도크를 얹지 않는다
  if (pathname?.startsWith("/docs")) return null;

  const ethKrw = ethKrwRaw ? BigInt(ethKrwRaw) : null;
  const latest = items[0] ?? null;

  return (
    <>
      {/* 고정 바 높이만큼 본문 끝을 밀어 푸터 마지막 줄이 가려지지 않게 한다 */}
      <div aria-hidden className="h-10" />

      <NaruFeedDrawer
        open={open}
        onClose={() => setOpen(false)}
        items={items}
        ethKrw={ethKrw}
      />

      <div className="fixed inset-x-0 bottom-0 z-30">
        {/* 하단 바 — 좌측은 소식 토글, 우측은 온보딩 가이드 상주 링크 */}
        <div className="border-t border-hairline bg-base/90 backdrop-blur-md">
          {/* 바는 뷰포트 전폭을 쓴다 — 우측 끝까지 시세를 붙이고 도움말은 딱 맞게 */}
          <div className="flex h-10 w-full items-center gap-3 pl-page pr-3">
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
            <TickerStrip tickers={tickers} />

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
