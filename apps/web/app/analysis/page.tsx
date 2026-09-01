import type { Metadata } from "next";
import { AnalysisCoverage } from "@/components/analysis/analysis-coverage";
import { AnalysisIntro } from "@/components/analysis/analysis-intro";
import { AnalysisStocksComing } from "@/components/analysis/analysis-stocks-coming";
import { AnalysisTabs } from "@/components/analysis/analysis-tabs";
import { ChainPulse } from "@/components/analysis/chain-pulse";
import { NaruFlow } from "@/components/analysis/naru-flow";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { getChainOverview } from "@/lib/chain";
import { getFlowCandles } from "@/lib/indexer";
import { getEthKrw } from "@/lib/krw";
import { getLiveAssets } from "@/lib/onchain";

/**
 * 분석 - 체인 층 위에 [토큰 | 온체인 주식] 탭.
 *
 * 위층(기와체인 활동)은 판 전체를, 토큰 탭은 나루 검증 자산 전체의 체결 흐름과
 * 표시 범위를 다룬다. 목록형 보드·자산별 보유 분포는 두지 않는다(2026-09-01
 * 팀 결정) - 토큰 화면과 겹치는 표현을 두 벌 세우면 분석이 아니라 목록 2다.
 * 보유 분포(보유 지갑·발행자 물량·상위 10 집중도)는 메인 토큰 보드 컬럼으로 옮겼다.
 *
 * 온체인 주식 탭은 외부 데이터 원천 연결 전이라 준비 중 패널 - 가짜 시세 대신
 * 보드 구성과 확정 고지(조회 전용·파생상품)만 미리 밝힌다 (팀 결정 2026-07-27).
 */

export const metadata: Metadata = {
  title: "분석 · 나루 NARU",
  description:
    "기와체인 활동과 나루 거래 흐름. 하루 거래 수, 수수료, 일별 거래대금, 순유입, 자산별 거래대금 비중.",
};

/** 체인 집계(Blockscout) fetch 캐시(60초)와 보폭을 맞춘다 */
export const revalidate = 60;

export default async function AnalysisPage() {
  const [assets, chain, ethKrw] = await Promise.all([
    getLiveAssets(),
    getChainOverview(),
    getEthKrw(),
  ]);

  // 나루 거래 흐름의 캔들은 자산 목록이 확정된 뒤에야 페어를 알 수 있어 뒤에 받는다
  const flowCandles = await getFlowCandles(assets.map((a) => a.pair));

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-page px-page pb-20 pt-8 sm:pt-12">
        <AnalysisIntro />
        <ChainPulse chain={chain} ethKrw={ethKrw} />
        <AnalysisTabs
          token={
            <>
              <NaruFlow
                assets={assets}
                candles={flowCandles}
                ethKrw={ethKrw}
              />
              <AnalysisCoverage
                verifiedCount={assets.length}
                issuedAts={assets.map((a) => a.issuedAt)}
              />
            </>
          }
          stocks={<AnalysisStocksComing />}
        />
      </main>
      <SiteFooter />
    </>
  );
}
