"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { giwaChain } from "@giwa/config";
import { formatEth, formatKrwCompact, wei, weiToDisplayKrw } from "@giwa/shared";
import type { FeedItemWire } from "@/lib/indexer";
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
}

const TAG: Record<
  FeedItemWire["type"],
  { label: (side?: "buy" | "sell") => string; className: string }
> = {
  listed: {
    label: () => "신규 상장",
    className: "bg-accent/15 text-accent",
  },
  issuer_sell: {
    label: () => "발행자 매도",
    className: "bg-down/15 text-down",
  },
  large_trade: {
    label: (side) => (side === "buy" ? "대형 매수" : "대형 매도"),
    className: "bg-up/15 text-up",
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
  const [open, setOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch("/api/feed");
        if (!res.ok) return;
        const data = (await res.json()) as FeedResponse;
        if (!cancelled && data.items && data.items.length > 0) {
          setItems(data.items);
          setEthKrwRaw(data.ethKrw);
        }
      } catch {
        /* 인덱서 미연결 — 도크를 띄우지 않는 것으로 폴백 */
      }
    };
    void load();
    const timer = setInterval(load, 60_000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  // 기술 문서는 독립 문서 화면 — 터미널 도크를 얹지 않는다
  if (pathname?.startsWith("/docs")) return null;

  const ethKrw = ethKrwRaw ? BigInt(ethKrwRaw) : null;
  const latest = items[0] ?? null;

  return (
    <>
      {/* 고정 바 높이만큼 본문 끝을 밀어 푸터 마지막 줄이 가려지지 않게 한다 */}
      <div aria-hidden className="h-10" />

      <div className="fixed inset-x-0 bottom-0 z-30">
        {/* 펼친 패널 */}
        {open ? (
          <section
            aria-label="나루터 소식 목록"
            className="max-h-[45vh] overflow-y-auto border-t border-hairline bg-[#160e07]/95 backdrop-blur-md"
          >
            <div className="mx-auto w-full max-w-[1840px] px-8 py-2">
              <p className="border-b border-black/40 py-2 text-[11px] text-ink-3">
                중대형 체결 · 유동성 변동 · 신규 상장 — 테스트넷 시드
                데이터입니다. 사실 서술만 제공하며 투자 권유가 아닙니다.
              </p>
              <ul className="grid gap-x-6 md:grid-cols-2">
                {items.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-start gap-2.5 border-b border-black/30 py-2.5 text-[12.5px] leading-relaxed last:border-0 md:[&:nth-last-child(2)]:border-0"
                  >
                    <span
                      className={`mt-0.5 shrink-0 rounded px-1.5 py-[2px] text-[10px] font-semibold ${TAG[item.type].className}`}
                    >
                      {TAG[item.type].label(item.side)}
                    </span>
                    <span className="min-w-0 text-ink-2">
                      <ItemBody item={item} ethKrw={ethKrw} />
                    </span>
                    <span className="ml-auto flex shrink-0 items-center gap-2 font-mono text-[10.5px] text-ink-3">
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
                  </li>
                ))}
              </ul>
            </div>
          </section>
        ) : null}

        {/* 하단 바 — 좌측은 소식 토글, 우측은 온보딩 가이드 상주 링크 */}
        <div className="border-t border-hairline bg-base/90 backdrop-blur-md">
          <div className="mx-auto flex h-10 w-full max-w-[1840px] items-center gap-3 px-8">
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
                    className={`shrink-0 rounded px-1.5 py-[1.5px] text-[10px] font-semibold ${TAG[latest.type].className}`}
                  >
                    {TAG[latest.type].label(latest.side)}
                  </span>
                  <span className="truncate">
                    {previewText(latest, ethKrw)}
                  </span>
                  <span className="shrink-0 font-mono text-[10.5px]">
                    {relativeTime(latest.timestamp)}
                  </span>
                </span>
              ) : null}
              {items.length > 0 ? (
                <span
                  aria-hidden
                  className="ml-auto shrink-0 text-[10px] text-ink-3"
                >
                  {open ? "▼ 접기" : "▲ 펼치기"}
                </span>
              ) : (
                <span className="ml-auto shrink-0 text-[11px] text-ink-3">
                  준비 중
                </span>
              )}
            </button>
            {/* 온보딩 가이드 — 어디서든 이탈 없이 오버레이로 (X 닫기) */}
            <button
              type="button"
              onClick={() => setGuideOpen(true)}
              className="shrink-0 border-l border-hairline pl-3 text-[12px] text-ink-3 transition-colors hover:text-accent"
            >
              처음이신가요? 가이드
            </button>
          </div>
        </div>

        <GuideOverlay open={guideOpen} onClose={() => setGuideOpen(false)} />
      </div>
    </>
  );
}
