"use client";

import Link from "next/link";
import {
  formatEth,
  formatKrwCompact,
  wei,
  weiToDisplayKrw,
} from "@giwa/shared";
import type { FeedItemWire } from "@/lib/indexer";

/**
 * 나루터 소식 항목 표현 — 태그·상대시간·요약·본문.
 * 드로어와 접힌 바 미리보기가 같은 표현 규칙을 공유한다.
 */

/** 색은 라벨과 같이 side 로 갈린다 — 매도를 상승색으로 칠하면 색만 보는 사람이 반대로 읽는다 */
export const TAG: Record<
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

export function relativeTime(ts: number): string {
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
export function previewText(item: FeedItemWire, ethKrw: bigint | null): string {
  const amount = item.wethAmount ? ` ${amountText(item.wethAmount, ethKrw)}` : "";
  if (item.type === "listed") return `${item.symbol} 검증 완료 · 거래 개시`;
  if (item.type === "issuer_sell") return `${item.symbol} 발행자 지갑 매도${amount}`;
  return `${item.symbol} ${item.side === "buy" ? "매수" : "매도"}${amount} 체결`;
}

export function ItemBody({
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
