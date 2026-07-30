"use client";

import Link from "next/link";
import { giwaChain } from "@giwa/config";
import { formatEth, formatKrw, wei, weiToDisplayKrw } from "@giwa/shared";
import { AssetAvatar } from "@/components/ui/asset-avatar";
import { Masked } from "@/components/portfolio/portfolio-holdings-table";
import type { Holding } from "@/components/portfolio/portfolio-holdings-table";
import type { WeiAmount } from "@giwa/shared";

/**
 * 내 자산 — 모바일 카드 렌더 (md 미만). 데스크톱 테이블과 같은 데이터 모델(Holding).
 * 카드 1장 = 자산 한 줄: 평가액이 1급, 보유 수량·비중은 보조 줄로 (밀도 절제).
 */
export function PortfolioHoldingsCards({
  holdings,
  totalWei,
  ethKrw,
  hidden,
  loading,
}: {
  holdings: Holding[];
  totalWei: WeiAmount;
  ethKrw: bigint | null;
  hidden: boolean;
  loading: boolean;
}) {
  if (loading) {
    return (
      <p className="mt-6 border-y border-black/45 bg-black/[0.12] px-4 py-14 text-center text-[13.5px] text-ink-3 md:hidden">
        온체인 잔고를 불러오는 중…
      </p>
    );
  }

  if (holdings.every((h) => h.balance === 0n)) {
    return (
      <p className="mt-6 border-y border-black/45 bg-black/[0.12] px-4 py-14 text-center text-[13.5px] text-ink-3 md:hidden">
        아직 보유 자산이 없습니다.{" "}
        <a
          href={giwaChain.bridgeUrl}
          target="_blank"
          rel="noreferrer"
          className="text-accent hover:underline"
        >
          브릿지에서 건너오기 ↗
        </a>{" "}
        또는{" "}
        <Link href="/" className="text-accent hover:underline">
          자산 둘러보기
        </Link>
      </p>
    );
  }

  return (
    <ul className="mt-6 border-y border-black/45 bg-black/[0.12] md:hidden">
      {holdings.map((h) => {
        const share =
          (totalWei as bigint) > 0n
            ? Number(((h.valueWei as bigint) * 10_000n) / (totalWei as bigint)) / 100
            : 0;
        return (
          <li
            key={h.key}
            className="border-b border-black/30 px-3 py-3 last:border-0"
          >
            <div className="flex items-center gap-3">
              <AssetAvatar
                symbol={h.symbol}
                isQuoteAnchor={h.isQuoteAnchor}
                size={34}
              />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 text-[14px] font-semibold tracking-wide">
                  {h.address ? (
                    <Link href={`/asset/${h.address}`}>{h.symbol}</Link>
                  ) : (
                    h.symbol
                  )}
                  {h.address ? null : (
                    <span className="rounded border border-hairline px-1 py-px text-[9.5px] text-ink-3">
                      네이티브
                    </span>
                  )}
                </p>
                <p className="mt-0.5 text-[11.5px] text-ink-3">{h.nameKo}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="font-mono text-[14px] font-medium tabular-nums">
                  <Masked hidden={hidden}>
                    {ethKrw
                      ? `₩${formatKrw(weiToDisplayKrw(h.valueWei, ethKrw))}`
                      : `${formatEth(h.valueWei, 6)} ETH`}
                  </Masked>
                </p>
                <p className="mt-0.5 font-mono text-[11.5px] tabular-nums text-ink-3">
                  <Masked hidden={hidden}>
                    {formatEth(wei(h.balance), h.address ? 2 : 6)}
                    <span className="ml-0.5 font-sans">
                      {h.address ? "개" : "ETH"}
                    </span>
                  </Masked>
                </p>
              </div>
            </div>

            {/* 비중 바 — 테이블의 비중 컬럼과 같은 산식 */}
            <div className="mt-2 flex items-center gap-2.5">
              <span
                aria-hidden
                className="h-1 flex-1 overflow-hidden rounded-full bg-black/40"
              >
                <span
                  className="block h-full rounded-full bg-accent/70"
                  style={{ width: `${Math.min(100, share)}%` }}
                />
              </span>
              <span className="w-14 text-right font-mono text-[11.5px] tabular-nums text-ink-3">
                {share.toFixed(2)}%
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
