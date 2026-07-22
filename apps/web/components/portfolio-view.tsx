"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { explorerAddressUrl, giwaChain } from "@giwa/config";
import {
  formatEth,
  formatKrw,
  formatKrwCompact,
  shortHex,
  wei,
  weiToDisplayKrw,
} from "@giwa/shared";
import type { WeiAmount } from "@giwa/shared";
import type { LiveAssetWire } from "@/lib/onchain";
import { AssetAvatar } from "./asset-avatar";
import { CopyAddress } from "./copy-address";
import { useWallet } from "./wallet-context";

/**
 * 내 자산 — 지갑 보유 자산 포트폴리오 (레퍼런스: 지갑 앱 포트폴리오 탭).
 * 지갑·체인 칩 + 총 평가액(숨김 토글) + 자산/현재가/보유/비중 테이블.
 * 손익(PnL)·활동 내역은 체결 이력이 필요해 인덱서 연결 후 추가한다.
 */

interface PortfolioResponse {
  ethBalance: string;
  holdings: (LiveAssetWire & { balance: string })[];
  ethKrw: string | null;
  updatedAt: number;
}

interface Holding {
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

const WEI = 10n ** 18n;

function Masked({ hidden, children }: { hidden: boolean; children: React.ReactNode }) {
  return hidden ? <span className="tracking-widest text-ink-3">•••••</span> : <>{children}</>;
}

export function PortfolioView() {
  const { account, signedAccount, setLoginOpen } = useWallet();
  const [data, setData] = useState<PortfolioResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hidden, setHidden] = useState(false);
  const [agoSec, setAgoSec] = useState(0);

  const refresh = useCallback(async () => {
    if (!account) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/portfolio?address=${account}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData((await res.json()) as PortfolioResponse);
    } catch {
      setError("잔고 조회에 실패했습니다 — 잠시 후 다시 시도해 주세요");
    } finally {
      setLoading(false);
    }
  }, [account]);

  useEffect(() => {
    setData(null);
    if (account) void refresh();
  }, [account, refresh]);

  /* "N초 전 업데이트" 표시 */
  useEffect(() => {
    if (!data) return;
    const tick = () => setAgoSec(Math.max(0, Math.floor((Date.now() - data.updatedAt) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [data]);

  const ethKrw = useMemo(
    () => (data?.ethKrw ? BigInt(data.ethKrw) : null),
    [data],
  );

  const holdings = useMemo<Holding[]>(() => {
    if (!data) return [];
    const rows: Holding[] = [];
    const ethBalance = BigInt(data.ethBalance);
    // 네이티브 ETH는 항상 첫 행 — 브릿지로 건너온 가스·기축 자산
    rows.push({
      key: "eth",
      symbol: "ETH",
      nameKo: "이더리움",
      address: null,
      isQuoteAnchor: true,
      balance: ethBalance,
      priceWei: wei(WEI),
      valueWei: wei(ethBalance),
    });
    for (const h of data.holdings) {
      const balance = BigInt(h.balance);
      if (balance === 0n) continue; // 미보유 자산은 숨긴다 (밀도 규칙)
      const price = BigInt(h.priceWei);
      rows.push({
        key: h.address,
        symbol: h.symbol,
        nameKo: h.nameKo,
        address: h.address,
        isQuoteAnchor: false,
        balance,
        priceWei: wei(price),
        valueWei: wei((balance * price) / WEI),
      });
    }
    return rows;
  }, [data]);

  const totalWei = useMemo(
    () => wei(holdings.reduce((acc, h) => acc + (h.valueWei as bigint), 0n)),
    [holdings],
  );

  /* ---------- 미연결 상태 ---------- */
  if (!account) {
    return (
      <div className="mx-auto w-full max-w-[1840px] px-8 pb-4 pt-12">
        <h1 className="text-[28px] font-bold tracking-tight">내 자산</h1>
        <div className="mx-auto mt-16 max-w-[520px] rounded-2xl carved p-10 text-center">
          <p className="text-[16px] font-semibold">
            지갑을 연결하면 보유 자산이 보입니다
          </p>
          <p className="mt-2.5 text-[13px] leading-relaxed text-ink-3">
            보유 수량과 평가액을 익숙한 원화 감각으로 보여드립니다.
          </p>
          <button
            type="button"
            onClick={() => setLoginOpen(true)}
            className="mt-6 inline-block rounded-lg bg-accent px-6 py-2.5 text-[13.5px] font-semibold text-accent-ink transition-[filter] hover:brightness-110"
          >
            지갑 연결하기
          </button>
          <p className="mt-4 text-[12px] text-ink-3">
            아직 기와 테스트넷 자산이 없다면{" "}
            <a
              href={giwaChain.bridgeUrl}
              target="_blank"
              rel="noreferrer"
              className="text-accent hover:underline"
            >
              공식 브릿지 ↗
            </a>
            에서 Sepolia ETH를 건너오는 것부터 시작합니다.
          </p>
        </div>
      </div>
    );
  }

  /* ---------- 연결됨 ---------- */
  return (
    <div className="mx-auto w-full max-w-[1840px] px-8 pb-4 pt-12">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-[28px] font-bold tracking-tight">내 자산</h1>
        {signedAccount !== account ? (
          <span className="rounded border border-warn/25 bg-warn/10 px-1.5 py-px text-[10px] text-warn">
            조회 전용 · 서명 로그인 전
          </span>
        ) : null}
      </div>

      {/* 지갑·체인·총액 칩 행 (레퍼런스 구조) */}
      <div className="mt-4 flex flex-wrap items-center gap-2.5">
        <span className="flex h-9 items-center gap-2 rounded-lg border border-hairline bg-panel px-3 text-[12.5px]">
          <span className="font-mono">{shortHex(account)}</span>
          <CopyAddress address={account} />
        </span>
        <span className="flex h-9 items-center gap-2 rounded-lg border border-hairline bg-panel px-3 text-[12.5px] text-ink-2">
          <span aria-hidden className="size-1.5 rounded-full bg-good" />
          {giwaChain.name}
        </span>
        <span className="flex h-9 items-center gap-2.5 rounded-lg border border-hairline bg-panel px-3 text-[13px]">
          <span className="text-ink-3">총 평가액</span>
          <span className="font-mono font-semibold tabular-nums">
            <Masked hidden={hidden}>
              {ethKrw
                ? `${formatKrwCompact(weiToDisplayKrw(totalWei, ethKrw))}원`
                : `${formatEth(totalWei, 6)} ETH`}
            </Masked>
          </span>
          <button
            type="button"
            onClick={() => setHidden((v) => !v)}
            aria-label={hidden ? "금액 표시" : "금액 숨김"}
            title={hidden ? "금액 표시" : "금액 숨김"}
            className="text-ink-3 transition-colors hover:text-ink-2"
          >
            <svg
              viewBox="0 0 16 16"
              width={14}
              height={14}
              fill="none"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              {hidden ? (
                <>
                  <path d="M2 8s2.2-4 6-4 6 4 6 4-2.2 4-6 4-6-4-6-4z" />
                  <path d="M3 3l10 10" />
                </>
              ) : (
                <>
                  <path d="M2 8s2.2-4 6-4 6 4 6 4-2.2 4-6 4-6-4-6-4z" />
                  <circle cx="8" cy="8" r="1.8" />
                </>
              )}
            </svg>
          </button>
        </span>

        <span className="ml-auto flex items-center gap-2 text-[12px] text-ink-3">
          {data ? `${agoSec}초 전 업데이트` : loading ? "불러오는 중…" : ""}
          <button
            type="button"
            onClick={() => void refresh()}
            disabled={loading}
            aria-label="새로고침"
            title="새로고침"
            className="grid size-8 place-items-center rounded-lg border border-hairline bg-panel text-ink-3 transition-colors hover:text-ink-2 disabled:opacity-50"
          >
            <svg
              viewBox="0 0 16 16"
              width={13}
              height={13}
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
              className={loading ? "animate-spin" : ""}
            >
              <path d="M13.5 8a5.5 5.5 0 1 1-1.6-3.9" />
              <path d="M13.5 1.8v2.7h-2.7" />
            </svg>
          </button>
        </span>
      </div>

      {error ? (
        <p className="mt-6 text-[13px] text-down">{error}</p>
      ) : null}

      {/* 자산 테이블 */}
      <div className="mt-6 border-y border-black/45 bg-black/[0.12]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] border-collapse text-left">
            <caption className="sr-only">보유 자산 — 현재가, 보유 수량, 평가액, 비중</caption>
            <thead>
              <tr className="border-b border-black/45 bg-[#120c06]/[0.97]">
                <th scope="col" className="py-2.5 pl-8 pr-4 text-[10.5px] font-medium tracking-[0.1em] text-ink-3">
                  자산
                </th>
                <th scope="col" className="w-[200px] px-4 py-2.5 text-right text-[10.5px] font-medium tracking-[0.1em] text-ink-3">
                  현재가
                </th>
                <th scope="col" className="w-[220px] px-4 py-2.5 text-right text-[10.5px] font-medium tracking-[0.1em] text-ink-3">
                  보유
                </th>
                <th scope="col" className="w-[240px] px-4 py-2.5 pr-8 text-right text-[10.5px] font-medium tracking-[0.1em] text-ink-3">
                  비중
                </th>
              </tr>
            </thead>
            <tbody>
              {!data && loading ? (
                <tr>
                  <td colSpan={4} className="py-14 text-center text-[13.5px] text-ink-3">
                    온체인 잔고를 불러오는 중…
                  </td>
                </tr>
              ) : holdings.every((h) => h.balance === 0n) ? (
                <tr>
                  <td colSpan={4} className="py-14 text-center text-[13.5px] text-ink-3">
                    아직 보유 자산이 없습니다 —{" "}
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
                              <p className="mt-0.5 font-mono text-[10.5px] tabular-nums text-ink-3">
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
                        <p className="mt-0.5 font-mono text-[10.5px] tabular-nums text-ink-3">
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

      <div className="mt-3 space-y-1 text-[11.5px] leading-relaxed text-ink-3">
        <p>
          · {giwaChain.name} 온체인 실잔고입니다. 원화 금액은 업비트 KRW-ETH
          시세로 환산한 참고값입니다.
        </p>
        <p>· 손익(PnL)·활동 내역은 인덱서 연결 후 제공됩니다.</p>
      </div>
    </div>
  );
}
