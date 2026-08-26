"use client";

import Link from "next/link";
import { giwaChain } from "@giwa/config";
import { formatChangeBps, formatEth, formatKrw, wei, weiToDisplayKrw } from "@giwa/shared";
import type { BasisPoints, WeiAmount } from "@giwa/shared";
import { AssetAvatar } from "@/components/ui/asset-avatar";

/**
 * 내 자산 - 보유 자산 테이블 (자산/현재가/보유/평가금액/총손익/비중).
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
  /**
   * 평가금액 (wei) - 스팟가 × 수량이 아니라 **풀에 전량 매도했을 때 받는 ETH**다.
   * 얕은 풀에서 스팟가는 실제 회수액보다 부풀고(풀의 5% 보유 시 약 5%,
   * 20% 보유 시 약 17%), 그 값을 자산 총액으로 보여주면 팔 수 없는 돈을
   * 가진 것처럼 읽힌다. 포인트 평가액과 같은 기준이라 두 화면 숫자도 일치한다
   * (CLAUDE.md 지표 정의 §스왑 견적: 산식 단일 소스는 amm.ts).
   */
  valueWei: WeiAmount;
  /** 스팟가 × 수량. 평가금액과의 차이가 곧 체결 시 밀리는 폭이다 */
  spotWei: WeiAmount;
  /**
   * 총손익 (wei, ETH 기준) = 평가금액 − 순투입(총매수 − 총매도).
   * null = 손익을 낼 수 없는 경우: 인덱서 미연결, 원장 잘림, 또는 원장 수량과
   * 잔고가 어긋나(전송 수령·전송 발송) 투입액과 평가액의 대상이 다른 자산.
   * 실현·미실현을 나누지 않는다 - 나누면 이동평균이냐 FIFO냐를 정해야 하는데,
   * 합쳐 보면 그 선택 없이도 답이 맞는다 (지표 정의 §손익).
   */
  pnlWei: WeiAmount | null;
  /** 수익률 (bps) = 총손익 ÷ 총매수 */
  roi: BasisPoints | null;
}

export function Masked({ hidden, children }: { hidden: boolean; children: React.ReactNode }) {
  return hidden ? <span className="tracking-widest text-ink-3">•••••</span> : <>{children}</>;
}

/**
 * 스팟가 대비 얼마나 밀리는지 - 0.1%p 미만이면 아예 감춘다.
 * 깊은 풀에서는 굳이 알릴 값이 아니고, 얕은 풀에서만 경고 없이 사실만 남긴다
 * (해석·경고를 앞세우지 않는다는 카피 규칙).
 */
function SlippageNote({
  spotWei,
  valueWei,
}: {
  spotWei: WeiAmount;
  valueWei: WeiAmount;
}) {
  const spot = spotWei as bigint;
  const value = valueWei as bigint;
  if (spot <= 0n || value >= spot) return null;
  const gapBp = Number(((spot - value) * 10_000n) / spot) / 100;
  if (gapBp < 0.1) return null;
  return (
    <p className="mt-0.5 text-[11px] tabular-nums text-ink-3">
      호가 대비 −{gapBp.toFixed(1)}%
    </p>
  );
}

/**
 * 총손익 셀 - ETH 기준 손익과 수익률 (실현·미실현 합산).
 *
 * 투입액을 모르는 자산은 "-"로 비운다. 0 으로 채우면 전송으로 받은 물량이
 * 전부 이익으로 잡혀 손익이 과대 계상된다 (지표 정의 §손익: 추정 금지).
 * 부호 색은 상승 초록 / 하락 빨강 국제 관례를 그대로 따른다.
 */
function PnlCell({
  pnlWei,
  roi,
  ethKrw,
  hidden,
}: {
  pnlWei: WeiAmount | null;
  roi: BasisPoints | null;
  ethKrw: bigint | null;
  hidden: boolean;
}) {
  if (pnlWei === null) {
    return <span className="font-mono text-[12px] text-ink-3">-</span>;
  }
  const v = pnlWei as bigint;
  const tone = v > 0n ? "text-up" : v < 0n ? "text-down" : "text-ink-2";
  const sign = v > 0n ? "+" : v < 0n ? "−" : "";
  const abs = wei(v < 0n ? -v : v);
  return (
    <>
      <p className={`font-mono text-[13px] font-medium tabular-nums ${tone}`}>
        <Masked hidden={hidden}>
          {sign}
          {ethKrw ? (
            <>
              <span className="mr-px">₩</span>
              {formatKrw(weiToDisplayKrw(abs, ethKrw))}
            </>
          ) : (
            <>
              {formatEth(abs, 6)}
              <span className="ml-0.5 font-sans text-[11px] text-ink-3">ETH</span>
            </>
          )}
        </Masked>
      </p>
      {roi !== null ? (
        <p className={`mt-0.5 font-mono text-[11.5px] tabular-nums ${tone}`}>
          {formatChangeBps(roi)}
        </p>
      ) : null}
    </>
  );
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
    /* 데스크톱 테이블 - 모바일 카드와의 전환은 부모의 <Responsive> 조립이 정한다 */
    <div className="mt-6 border-y border-black/45 bg-black/[0.12]">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] border-collapse text-left">
          <caption className="sr-only">보유 자산: 현재가, 보유 수량, 평가금액, 총손익, 비중</caption>
          <thead>
            <tr className="border-b border-black/45 bg-[#120c06]/[0.97]">
              <th scope="col" className="py-2.5 pl-8 pr-4 text-[11.5px] font-medium tracking-[0.1em] text-ink-3">
                자산
              </th>
              <th scope="col" className="w-[200px] px-4 py-2.5 text-right text-[11.5px] font-medium tracking-[0.1em] text-ink-3">
                현재가
              </th>
              <th scope="col" className="w-[180px] px-4 py-2.5 text-right text-[11.5px] font-medium tracking-[0.1em] text-ink-3">
                보유
              </th>
              <th scope="col" className="w-[190px] px-4 py-2.5 text-right text-[11.5px] font-medium tracking-[0.1em] text-ink-3">
                평가금액
              </th>
              <th scope="col" className="w-[190px] px-4 py-2.5 text-right text-[11.5px] font-medium tracking-[0.1em] text-ink-3">
                총손익
              </th>
              <th scope="col" className="w-[180px] px-4 py-2.5 pr-8 text-right text-[11.5px] font-medium tracking-[0.1em] text-ink-3">
                비중
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="py-14 text-center text-[13.5px] text-ink-3">
                  잔고를 불러오는 중…
                </td>
              </tr>
            ) : holdings.every((h) => h.balance === 0n) ? (
              <tr>
                <td colSpan={6} className="py-14 text-center text-[13.5px] text-ink-3">
                  아직 보유 자산이 없습니다.{" "}
                  <a
                    href={giwaChain.bridgeUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-accent hover:underline"
                  >
                    기와체인으로 옮겨오기 ↗
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
                    </td>

                    {/* 평가금액 - 전량 매도 시 받는 금액. 스팟가와 벌어지면 그 폭을 같이 밝힌다 */}
                    <td className="px-4 py-3 text-right">
                      <p className="font-mono text-[13px] font-medium tabular-nums">
                        <Masked hidden={hidden}>
                          {ethKrw ? (
                            <>
                              <span className="mr-px text-ink-2">₩</span>
                              {formatKrw(weiToDisplayKrw(h.valueWei, ethKrw))}
                            </>
                          ) : (
                            <>
                              {formatEth(h.valueWei, 6)}
                              <span className="ml-0.5 font-sans text-[11px] text-ink-3">
                                ETH
                              </span>
                            </>
                          )}
                        </Masked>
                      </p>
                      <SlippageNote spotWei={h.spotWei} valueWei={h.valueWei} />
                    </td>

                    <td className="px-4 py-3 text-right">
                      <PnlCell
                        pnlWei={h.pnlWei}
                        roi={h.roi}
                        ethKrw={ethKrw}
                        hidden={hidden}
                      />
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
