"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { giwaChain } from "@giwa/config";
import {
  formatChangeBps,
  formatEth,
  formatKrwCompact,
  getAmountOut,
  roiBps,
  shortHex,
  summarizeTrades,
  totalPnlWei,
  wei,
  weiToDisplayKrw,
} from "@giwa/shared";
import type { BasisPoints, PnlTrade } from "@giwa/shared";
import type { PortfolioResponse } from "@/lib/api-types";
import { usePoll } from "@/hooks/use-poll";
import { CopyAddress } from "@/components/ui/copy-address";
import { PortfolioHoldingsCards } from "@/components/portfolio/portfolio-holdings-cards";
import { Masked, PortfolioHoldingsTable } from "@/components/portfolio/portfolio-holdings-table";
import { Responsive } from "@/components/ui/responsive";
import type { Holding } from "@/components/portfolio/portfolio-holdings-table";
import { useWallet } from "@/contexts/wallet-context";

/**
 * 내 자산 — 지갑 보유 자산 포트폴리오 (레퍼런스: 지갑 앱 포트폴리오 탭).
 * 지갑·체인 칩 + 총 평가액·총손익(숨김 토글) + 자산/현재가/보유/평가금액/총손익/비중 테이블.
 * 활동 내역(거래 목록)은 이어서 붙인다.
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

  /*
   * 토큰별 체결 원장 요약 → 순투입·총매수 (지표 정의 §손익).
   * 원장이 잘렸으면(truncated) 앞부분 매수가 빠져 순투입이 틀리므로 통째로 포기한다 —
   * 조용히 틀린 손익을 보여주느니 열을 감춘다.
   */
  const pnlByToken = useMemo(() => {
    if (!data?.trades || data.tradesTruncated) return null;
    const byToken = new Map<string, PnlTrade[]>();
    for (const t of data.trades) {
      const key = t.token.toLowerCase();
      const list = byToken.get(key) ?? [];
      list.push({
        side: t.side,
        tokenAmount: BigInt(t.tokenAmount),
        wethAmount: BigInt(t.wethAmount),
      });
      byToken.set(key, list);
    }
    return new Map([...byToken].map(([k, v]) => [k, summarizeTrades(v)]));
  }, [data]);

  /*
   * 자산별 손익 — 표에 뜨는 행이 아니라 **보유 목록 전체**를 훑는다.
   * 전량 매도해 잔고가 0인 자산도 실현 손익을 갖고 있어서(평가 0 − 음수 순투입),
   * 표시용으로 걸러낸 행에서 합계를 내면 그 이익이 조용히 사라진다.
   *
   * 원장 수량과 잔고가 정확히 같을 때만 손익을 낸다. 적으면 전송으로 받은 물량이
   * 섞인 것이고, 많으면 전송으로 내보낸 것이다 — 어느 쪽이든 투입액과 평가액의
   * 대상이 어긋나 손익이 틀린다 (지표 정의 §손익: 추정 금지).
   */
  const assetPnl = useMemo(() => {
    if (!data) return null;
    const out = new Map<
      string,
      { boughtWei: bigint; pnlWei: bigint; roi: BasisPoints | null } | null
    >();
    for (const h of data.holdings) {
      const key = h.address.toLowerCase();
      const ledger = pnlByToken?.get(key) ?? null;
      const balance = BigInt(h.balance);
      // 잔고도 거래 이력도 없으면 이 지갑과 무관한 자산 — 제외 집계에도 넣지 않는다
      if (balance === 0n && ledger === null) continue;
      if (ledger === null || ledger.ledgerQty !== balance) {
        out.set(key, null);
        continue;
      }
      // 잔고 0 이면 getAmountOut 도 0 — 실현 손익만 남는다
      const valueWei = getAmountOut(
        balance,
        BigInt(h.tokenReserveWei),
        BigInt(h.wethReserveWei),
      );
      const boughtWei = ledger.grossBoughtWei as bigint;
      const pnlWei = totalPnlWei(valueWei, ledger.netInvestedWei as bigint) as bigint;
      out.set(key, { boughtWei, pnlWei, roi: roiBps(pnlWei, boughtWei) });
    }
    return out;
  }, [data, pnlByToken]);

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
      // ETH 는 팔 필요가 없는 기축이라 평가금액과 스팟이 같다
      valueWei: wei(ethBalance),
      spotWei: wei(ethBalance),
      // 기축 자산은 손익의 기준이라 자기 자신에 대한 손익이 없다
      pnlWei: null,
      roi: null,
    });
    for (const h of data.holdings) {
      const balance = BigInt(h.balance);
      if (balance === 0n) continue; // 미보유 자산은 숨긴다 (밀도 규칙)
      const price = BigInt(h.priceWei);
      const valueWei = getAmountOut(
        balance,
        BigInt(h.tokenReserveWei),
        BigInt(h.wethReserveWei),
      );
      const pnl = assetPnl?.get(h.address.toLowerCase()) ?? null;

      rows.push({
        key: h.address,
        symbol: h.symbol,
        nameKo: h.nameKo,
        address: h.address,
        isQuoteAnchor: false,
        balance,
        priceWei: wei(price),
        /* 평가금액 = 풀에 전량 매도했을 때 받는 ETH.
           스팟가 × 수량은 얕은 풀에서 실제 회수액보다 부풀고, 포인트 화면은
           이미 이 기준을 쓴다 — 같은 보유분에 두 숫자가 나오지 않게 통일한다 */
        valueWei: wei(valueWei),
        spotWei: wei((balance * price) / WEI),
        pnlWei: pnl === null ? null : wei(pnl.pnlWei),
        roi: pnl?.roi ?? null,
      });
    }
    return rows;
  }, [data, assetPnl]);

  const totalWei = useMemo(
    () => wei(holdings.reduce((acc, h) => acc + (h.valueWei as bigint), 0n)),
    [holdings],
  );

  /*
   * 총손익 — 투입액을 아는 자산만 더한다. assetPnl 을 훑으므로 전량 매도해
   * 표에서 사라진 자산의 실현 손익도 합계에 남는다.
   * 투입액 불명 자산을 0원가로 끼우면 합계가 부풀므로 빼되, 몇 종을 뺐는지
   * 화면에 밝힌다 (지표 정의 §손익: 추정 금지).
   */
  const totalPnl = useMemo(() => {
    if (!assetPnl) return null;
    let pnl = 0n;
    let cost = 0n;
    let counted = 0;
    let skipped = 0;
    for (const entry of assetPnl.values()) {
      if (entry === null) {
        skipped += 1;
        continue;
      }
      pnl += entry.pnlWei;
      cost += entry.boughtWei;
      counted += 1;
    }
    if (counted === 0) return null;
    return { pnlWei: wei(pnl), roi: roiBps(pnl, cost), skipped };
  }, [assetPnl]);

  /* ---------- 미연결 상태 ---------- */
  if (!account) {
    return (
      <div className="mx-auto w-full max-w-[1840px] px-page pb-4 pt-8 sm:pt-12">
        <h1 className="text-[24px] font-bold tracking-tight sm:text-[28px]">내 자산</h1>
        <div className="mx-auto mt-16 max-w-[520px] rounded-2xl carved p-6 text-center sm:p-10">
          <p className="text-[16px] font-semibold">
            지갑을 연결하면 보유 자산이 보입니다
          </p>
          <p className="mt-2.5 text-[13px] leading-relaxed text-ink-3">
            보유 수량과 원화 환산 평가액을 확인하세요.
          </p>
          <button
            type="button"
            onClick={() => setLoginOpen(true)}
            className="mt-6 inline-block rounded-lg bg-accent px-6 py-2.5 text-[13.5px] font-semibold text-accent-ink transition-[filter] hover:brightness-110"
          >
            로그인하기
          </button>
          <p className="mt-4 text-[12px] text-ink-3">
            아직 기와 테스트넷 자산이 없다면{" "}
            <a
              href={giwaChain.bridgeUrl}
              target="_blank"
              rel="noreferrer"
              className="text-accent hover:underline"
            >
              자산 옮기기 ↗
            </a>
            에서 Sepolia ETH를 건너오는 것부터 시작합니다.
          </p>
        </div>
      </div>
    );
  }

  /* ---------- 연결됨 ---------- */
  return (
    <div className="mx-auto w-full max-w-[1840px] px-page pb-4 pt-8 sm:pt-12">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-[24px] font-bold tracking-tight sm:text-[28px]">내 자산</h1>
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
          기와체인으로 옮겨오기 <span aria-hidden className="text-[11px]">↗</span>
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

        {/* 총손익 — 총 평가액 옆에 붙여 "얼마 있고, 얼마 벌었나"를 한 줄로 읽게 한다.
            숨김은 총 평가액과 같은 토글을 공유한다: 금액만 가리고 손익이 남으면
            어깨너머로 규모가 그대로 드러나 가리는 의미가 없다 */}
        {totalPnl ? (
          <span className="flex h-9 items-center gap-2.5 rounded-lg border border-hairline bg-panel px-3 text-[13px]">
            <span className="text-ink-3">총손익</span>
            {(() => {
              const v = totalPnl.pnlWei as bigint;
              const tone = v > 0n ? "text-up" : v < 0n ? "text-down" : "text-ink-2";
              const sign = v > 0n ? "+" : v < 0n ? "−" : "";
              const abs = wei(v < 0n ? -v : v);
              return (
                <span className={`font-mono font-semibold tabular-nums ${tone}`}>
                  <Masked hidden={hidden}>
                    {sign}
                    {ethKrw
                      ? `${formatKrwCompact(weiToDisplayKrw(abs, ethKrw))}원`
                      : `${formatEth(abs, 6)} ETH`}
                    {totalPnl.roi !== null ? (
                      <span className="ml-1.5 text-[12px] font-medium">
                        {formatChangeBps(totalPnl.roi)}
                      </span>
                    ) : null}
                  </Masked>
                </span>
              );
            })()}
            {totalPnl.skipped > 0 ? (
              <span
                className="text-[11px] text-ink-3"
                title="매수 이력이 없는 물량이 섞여 취득원가를 알 수 없는 자산입니다"
              >
                {totalPnl.skipped}종 제외
              </span>
            ) : null}
          </span>
        ) : null}

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

      {/* 자산 목록 — 뷰포트별 조립 (전환 방식·이유는 ui/responsive.tsx 주석) */}
      <Responsive
        desktop={
          <PortfolioHoldingsTable
            holdings={holdings}
            totalWei={totalWei}
            ethKrw={ethKrw}
            hidden={hidden}
            loading={!data && loading}
          />
        }
        mobile={
          <PortfolioHoldingsCards
            holdings={holdings}
            totalWei={totalWei}
            ethKrw={ethKrw}
            hidden={hidden}
            loading={!data && loading}
          />
        }
      />

      <div className="mt-3 space-y-1 text-[11.5px] leading-relaxed text-ink-3">
        <p>
          · {giwaChain.name} 실잔고입니다. 원화 금액은 업비트 KRW-ETH
          시세로 환산한 참고값입니다.
        </p>
        {/* 산식과 기준 통화를 반드시 밝힌다 — ETH 기준이라는 라벨이 없으면
            "원화로 산 것 대비 손익"으로 읽힌다 (지표 정의 §손익) */}
        <p>
          · 평가금액은 풀에 전량 매도했을 때 받는 금액이며, 호가(현재가 × 수량)와
          다를 수 있습니다.
        </p>
        <p>
          · 총손익 = 평가금액 − (총매수 − 총매도)이며, 판 것과 들고 있는 것을
          합친 값입니다. <b className="font-medium text-ink-2">ETH 기준</b>으로
          계산한 뒤 현재 환율로 환산하므로, 토큰을 팔지 않아도 ETH 시세에 따라
          원화 표시가 변합니다. 수익률은 총매수 대비입니다.
        </p>
        <p>
          · 거래 이력과 잔고가 맞지 않는 자산은 손익을{" "}
          <b className="font-medium text-ink-2">—</b>로 비워 둡니다. 다른 지갑에서
          받아왔거나 다른 지갑으로 보낸 물량이 섞이면 투입한 금액과 남은 수량의
          대상이 달라져 손익이 실제와 어긋나기 때문입니다. 거래 내역은 이어서
          제공합니다.
        </p>
      </div>
    </div>
  );
}
