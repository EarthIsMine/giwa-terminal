"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { giwaChain } from "@giwa/config";
import { formatEth, formatKrwCompact, shortHex, wei, weiToDisplayKrw } from "@giwa/shared";
import type { PortfolioResponse } from "@/lib/api-types";
import { usePoll } from "@/hooks/use-poll";
import { CopyAddress } from "@/components/ui/copy-address";
import { Masked, PortfolioHoldingsTable } from "@/components/portfolio/portfolio-holdings-table";
import type { Holding } from "@/components/portfolio/portfolio-holdings-table";
import { useWallet } from "@/contexts/wallet-context";

/**
 * 내 자산 — 지갑 보유 자산 포트폴리오 (레퍼런스: 지갑 앱 포트폴리오 탭).
 * 지갑·체인 칩 + 총 평가액(숨김 토글) + 자산/현재가/보유/비중 테이블.
 * 손익(PnL)·활동 내역은 체결 이력이 필요해 인덱서 연결 후 추가한다.
 */

const WEI = 10n ** 18n;

export function PortfolioView() {
  const { account, signedAccount, setLoginOpen } = useWallet();
  const [data, setData] = useState<PortfolioResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hidden, setHidden] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());

  const refresh = useCallback(async () => {
    if (!account) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/portfolio?address=${account}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData((await res.json()) as PortfolioResponse);
    } catch {
      setError("잔고 조회에 실패했습니다. 잠시 후 다시 시도해 주세요");
    } finally {
      setLoading(false);
    }
  }, [account]);

  useEffect(() => {
    setData(null);
    if (account) void refresh();
  }, [account, refresh]);

  /* "N초 전 업데이트" 표시 — 1초 틱은 state, 경과 초는 렌더 시점 파생.
     data 가 없으면 인터벌 자체를 걸지 않는다 (미연결 화면에서 빈 틱 방지) */
  usePoll(() => setNowMs(Date.now()), data ? 1000 : null);
  const agoSec = data ? Math.max(0, Math.floor((nowMs - data.updatedAt) / 1000)) : 0;

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
          <span className="rounded border border-warn/25 bg-warn/10 px-1.5 py-px text-[11px] text-warn">
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
        {/* 자산을 채우는 화면이라 브릿지 진입점을 상시로 둔다 (네비에서 이전) */}
        <a
          href={giwaChain.bridgeUrl}
          target="_blank"
          rel="noreferrer"
          className="flex h-9 items-center gap-1.5 rounded-lg border border-hairline bg-panel px-3 text-[12.5px] text-ink-2 transition-colors hover:border-accent/40 hover:text-accent"
        >
          브릿지에서 가져오기 <span aria-hidden className="text-[11px]">↗</span>
        </a>
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
      <PortfolioHoldingsTable
        holdings={holdings}
        totalWei={totalWei}
        ethKrw={ethKrw}
        hidden={hidden}
        loading={!data && loading}
      />

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
