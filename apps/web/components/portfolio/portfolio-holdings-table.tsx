"use client";

import Link from "next/link";
import { giwaChain } from "@giwa/config";
import { formatEth, formatKrw, wei, weiToDisplayKrw } from "@giwa/shared";
import type { WeiAmount } from "@giwa/shared";
import { AssetAvatar } from "@/components/ui/asset-avatar";

/**
 * 내 자산 — 보유 자산 테이블 (자산/현재가/보유/비중).
 * 상태는 PortfolioView 가 소유하고, 여기는 렌더만 담당한다.
 */

export interface Holding {
  key: string;
  symbol: string;
  nameKo: string;
  address: `0x${string}` | null; // null = 네이티브 ETH
  isQuoteAnchor: boolean;
  balance: bigint;
  priceWei: WeiAmount;
  /** ETH 환산 평가액 (wei) */
  valueWei: WeiAmount;
}

export function Masked({ hidden, children }: { hidden: boolean; children: React.ReactNode }) {
  return hidden ? <span className="tracking-widest text-ink-3">•••••</span> : <>{children}</>;
}

interface PortfolioHoldingsTableProps {
  holdings: Holding[];
  totalWei: WeiAmount;
  ethKrw: bigint | null;
  hidden: boolean;
  /** 첫 로드 중(데이터 없음 + 로딩) 여부 */
  loading: boolean;
}

export function PortfolioHoldingsTable({
  holdings,
  totalWei,
  ethKrw,
  hidden,
  loading,
}: PortfolioHoldingsTableProps) {
  return (
    <div className="mt-6 border-y border-black/45 bg-black/[0.12]">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] border-collapse text-left">
          <caption className="sr-only">보유 자산: 현재가, 보유 수량, 평가액, 비중</caption>
          <thead>
            <tr className="border-b border-black/45 bg-[#120c06]/[0.97]">
              <th scope="col" className="py-2.5 pl-8 pr-4 text-[11.5px] font-medium tracking-[0.1em] text-ink-3">
                자산
              </th>
              <th scope="col" className="w-[200px] px-4 py-2.5 text-right text-[11.5px] font-medium tracking-[0.1em] text-ink-3">
                현재가
              </th>
              <th scope="col" className="w-[220px] px-4 py-2.5 text-right text-[11.5px] font-medium tracking-[0.1em] text-ink-3">
                보유
              </th>
              <th scope="col" className="w-[240px] px-4 py-2.5 pr-8 text-right text-[11.5px] font-medium tracking-[0.1em] text-ink-3">
                비중
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="py-14 text-center text-[13.5px] text-ink-3">
                  온체인 잔고를 불러오는 중…
                </td>
              </tr>
            ) : holdings.every((h) => h.balance === 0n) ? (
              <tr>
                <td colSpan={4} className="py-14 text-center text-[13.5px] text-ink-3">
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
                </td>
              </tr>
            ) : (
              holdings.map((h) => {
                const share =
                  (totalWei as bigint) > 0n
                    ? Number(((h.valueWei as bigint) * 10_000n) / (totalWei as bigint)) / 100
                    : 0;
                return (
                  <tr
                    key={h.key}
                    className="border-b border-black/30 transition-colors last:border-0 hover:bg-black/30"
                  >
                    <td className="py-3 pl-8 pr-4">
                      <div className="flex items-center gap-2.5">
                        <AssetAvatar symbol={h.symbol} isQuoteAnchor={h.isQuoteAnchor} size={30} />
                        <div>
                          <p className="flex items-center gap-1.5 text-[13.5px] font-semibold tracking-wide">
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
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {ethKrw ? (
                        <div>
                          <p className="font-mono text-[13px] font-medium tabular-nums">
                            <span className="mr-px text-ink-2">₩</span>
                            {formatKrw(weiToDisplayKrw(h.priceWei, ethKrw))}
                          </p>
                          {h.address ? (
                            <p className="mt-0.5 font-mono text-[11.5px] tabular-nums text-ink-3">
                              {formatEth(h.priceWei, 8)} ETH
                            </p>
                          ) : null}
                        </div>
                      ) : (
                        <span className="font-mono text-[13px] tabular-nums">
                          {formatEth(h.priceWei, 8)}{" "}
                          <span className="text-[11px] text-ink-3">ETH</span>
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <p className="font-mono text-[13px] font-medium tabular-nums">
                        <Masked hidden={hidden}>
                          {formatEth(wei(h.balance), h.address ? 2 : 6)}
                          <span className="ml-0.5 font-sans text-[11px] text-ink-3">
                            {h.address ? "개" : "ETH"}
                          </span>
                        </Masked>
                      </p>
                      <p className="mt-0.5 font-mono text-[11.5px] tabular-nums text-ink-3">
                        <Masked hidden={hidden}>
                          {ethKrw
                            ? `₩${formatKrw(weiToDisplayKrw(h.valueWei, ethKrw))}`
                            : `${formatEth(h.valueWei, 6)} ETH`}
                        </Masked>
                      </p>
                    </td>
                    <td className="px-4 py-3 pr-8">
                      <div className="flex items-center justify-end gap-2.5">
                        <span
                          aria-hidden
                          className="h-1 w-24 overflow-hidden rounded-full bg-black/40"
                        >
                          <span
                            className="block h-full rounded-full bg-accent/70"
                            style={{ width: `${Math.min(100, share)}%` }}
                          />
                        </span>
                        <span className="w-14 text-right font-mono text-[12.5px] tabular-nums">
                          {share.toFixed(2)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
