"use client";

import { useState } from "react";
import { getAmountOut, wei, weiToDisplayKrw } from "@giwa/shared";
import type { DisplayKrw } from "@giwa/shared";
import type { PortfolioResponse } from "@/lib/api-types";
import { useAsyncEffect } from "@/hooks/use-async-effect";
import { useWallet } from "@/contexts/wallet-context";
import { PointsEligibilityCard } from "@/components/points/points-eligibility-card";
import type { KycState } from "@/components/points/points-eligibility-card";
import { PointsLoop } from "@/components/points/points-loop";
import { PointsSeasonPreview } from "@/components/points/points-season-preview";
import { PointsTierCard } from "@/components/points/points-tier-card";

/**
 * 나루 포인트 (기획서 §4.4 · 명세서 §2.5) - 시즌 0 이전의 정직한 화면.
 * 지금 실동작하는 것: ① 도장(Dojang) 업비트 KYC 게이트 온체인 조회
 * ② 예상 잔고 포인트 미리보기 - 명세서 산식 그대로(매도 시뮬레이션 평가).
 * 가짜 점수·가짜 이벤트는 만들지 않는다. 적립 원장은 시즌 0 집계 서버(P1)가 연다.
 * 카피 주의: 수익·보상 보장 표현 금지(절대 규칙 2) - "참여", "배분"만 쓴다.
 * 렌더 분리: 좌 카드 = PointsEligibilityCard, 우 설명 = PointsGuide - 상태·조회는 여기서만.
 */

/** 잔고 구간표 (명세서 §2.5) - DisplayKrw(0.001원 단위)로 비교 */
const TIERS = [
  { minKrwMilli: 100_000_000_000n, points: 4, label: "1억원 이상" },
  { minKrwMilli: 10_000_000_000n, points: 3, label: "1,000만원 ~ 1억원" },
  { minKrwMilli: 1_000_000_000n, points: 2, label: "100만원 ~ 1,000만원" },
  { minKrwMilli: 100_000_000n, points: 1, label: "10만원 ~ 100만원" },
  { minKrwMilli: 0n, points: 0, label: "10만원 미만" },
] as const;

export function PointsView() {
  const { account, setLoginOpen } = useWallet();
  const [kyc, setKyc] = useState<KycState>("idle");
  const [valueKrwMilli, setValueKrwMilli] = useState<DisplayKrw | null>(null);
  const [valueLoaded, setValueLoaded] = useState(false);

  useAsyncEffect(
    async (isCancelled) => {
      setKyc(account ? "loading" : "idle");
      setValueKrwMilli(null);
      setValueLoaded(false);
      if (!account) return;

      try {
        const [dojangRes, portfolioRes] = await Promise.all([
          fetch(`/api/dojang?address=${account}`),
          fetch(`/api/portfolio?address=${account}`),
        ]);
        if (!isCancelled() && dojangRes.ok) {
          const { verified } = (await dojangRes.json()) as {
            verified: boolean | null;
          };
          setKyc(
            verified === null ? "error" : verified ? "verified" : "unverified",
          );
        } else if (!isCancelled()) {
          setKyc("error");
        }
        if (!isCancelled() && portfolioRes.ok) {
          const p = (await portfolioRes.json()) as PortfolioResponse;
          if (p.ethKrw) {
            const ethKrw = BigInt(p.ethKrw);
            /* 평가액 = ETH 잔고 + Σ(검증 자산을 풀에 전량 매도했을 때 받는 ETH).
               스팟가가 아니라 매도 시뮬레이션인 건 조작 방어 (명세서 §2.5) */
            let totalWei = BigInt(p.ethBalance);
            for (const h of p.holdings) {
              totalWei += getAmountOut(
                BigInt(h.balance),
                BigInt(h.tokenReserveWei),
                BigInt(h.wethReserveWei),
              );
            }
            setValueKrwMilli(weiToDisplayKrw(wei(totalWei), ethKrw));
          }
          setValueLoaded(true);
        }
      } catch {
        if (!isCancelled()) setKyc("error");
      }
    },
    [account],
  );

  // 마지막 구간이 min 0 이라 find 는 항상 매칭 - 폴백은 타입 안전용
  const tier =
    valueKrwMilli === null
      ? null
      : (TIERS.find((t) => valueKrwMilli >= t.minKrwMilli) ?? TIERS[0]);

  /*
   * 위에서 아래로 이야기 하나: ① 어떻게 도는가(행로) → ② 나는 지금 어디인가
   * + 얼마나 쌓이는가 → ③ 무엇에 쓰는가(상장 이벤트). 예전의 좌카드/우문서
   * 2단은 설명서처럼 읽혀서 걷어냈다 - 행로가 전폭 첫 줄에 온다.
   */
  return (
    <div className="mt-8 space-y-5">
      <PointsLoop />

      <div className="flex flex-col gap-5 xl:flex-row">
        <div className="w-full shrink-0 xl:w-[420px]">
          <PointsEligibilityCard
            account={account}
            onConnect={() => setLoginOpen(true)}
            kyc={kyc}
            tier={tier}
            valueKrwMilli={valueKrwMilli}
            valueLoaded={valueLoaded}
          />
        </div>
        <div className="min-w-0 flex-1">
          <PointsTierCard tiers={TIERS} />
        </div>
      </div>

      <PointsSeasonPreview />

      <p className="text-[11px] leading-relaxed text-ink-3">
        · 포인트는 양도·환금할 수 없고 기와체인 토큰이 아닙니다. 배분은 추첨
        없는 확정형이며 확률형 요소를 도입하지 않습니다.
        <br />· 인증 지갑 하나에 나루 계정 하나만 연결됩니다. 로그인 자체는
        누구나 가능하고, 시세·분석 조회에는 제한이 없습니다.
        <br />· 배분 참여는 투자 권유가 아니며, 배분 자산의 가치는 변동할 수
        있습니다.
      </p>
    </div>
  );
}
