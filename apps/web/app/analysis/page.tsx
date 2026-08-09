import type { Metadata } from "next";
import { AnalysisCoverage } from "@/components/analysis/analysis-coverage";
import { AnalysisIntro } from "@/components/analysis/analysis-intro";
import { AnalysisStocksComing } from "@/components/analysis/analysis-stocks-coming";
import { AnalysisTabs } from "@/components/analysis/analysis-tabs";
import {
  AnalysisTokenBoard,
  type AnalysisTokenRow,
} from "@/components/analysis/analysis-token-board";
import { ChainPulse } from "@/components/analysis/chain-pulse";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { getHolderAnalysis } from "@/lib/analysis";
import { getChainOverview } from "@/lib/chain";
import { getBoardStats } from "@/lib/indexer";
import { getEthKrw } from "@/lib/krw";
import { getLiveAssets } from "@/lib/onchain";

/**
 * 분석 — 체인 → 범위 → 자산 순으로 내려간다.
 *
 * 위층(기와체인 활동)은 판 전체를, 아래층 탭은 나루가 검증한 자산을 다룬다.
 * 자산 보드만 있던 시절엔 토큰 화면과 같은 목록을 열만 바꿔 보여줘서
 * 분석이라 부를 게 없었다 — 체인을 프레임으로 올려 그 자리를 채운다.
 *
 * 온체인 주식 탭은 외부 데이터 원천 연결 전이라 준비 중 패널 — 가짜 시세 대신
 * 보드 구성과 확정 고지(조회 전용·파생상품)만 미리 밝힌다 (팀 결정 2026-07-27).
 */

export const metadata: Metadata = {
  title: "분석 · 나루 NARU",
  description:
    "기와체인 활동과 검증 자산의 보유 현황. 하루 거래 수, 거래 수수료, 홀더 수, 발행자 물량, 상위 지갑 집중도.",
};

/** Blockscout 홀더 집계 fetch 캐시(60초)와 보폭을 맞춘다 */
export const revalidate = 60;

export default async function AnalysisPage() {
  const [assets, boardStats, chain, ethKrw] = await Promise.all([
    getLiveAssets(),
    getBoardStats(),
    getChainOverview(),
    getEthKrw(),
  ]);

  // 자산별 보유 분포는 상세 페이지와 같은 리더(getHolderAnalysis)를 그대로 쓴다.
  // 자산이 수십 종 이내라는 전제의 병렬 조회 — fetch 60초 캐시가 Blockscout 부하를 묶는다.
  const analyses = await Promise.all(
    assets.map((a) =>
      getHolderAnalysis({
        token: a.address,
        pair: a.pair,
        issuer: a.issuer,
        totalSupply: a.totalSupply,
      }),
    ),
  );

  // 정렬은 자산 보드와 동일(예치 규모 내림차순) — 화면마다 순서가 다르면 헷갈린다
  const rows: AnalysisTokenRow[] = assets.map((a, i) => {
    const analysis = analyses[i] ?? null;
    return {
      address: a.address,
      symbol: a.symbol,
      nameKo: a.nameKo,
      issuerName: a.issuerName,
      verification: a.verification,
      holderCount: analysis?.holderCount ?? null,
      issuerPermille: analysis?.issuerPermille ?? null,
      top10Permille: analysis?.top10Permille ?? null,
      traders30d:
        boardStats?.[a.pair.toLowerCase()]?.windows["30d"]?.traders ?? null,
    };
  });

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-[1280px] px-page pb-20 pt-8 sm:pt-12">
        <AnalysisIntro />
        <ChainPulse chain={chain} ethKrw={ethKrw} />
        <AnalysisCoverage verifiedCount={assets.length} />
        <AnalysisTabs
          token={<AnalysisTokenBoard rows={rows} />}
          stocks={<AnalysisStocksComing />}
        />
      </main>
      <SiteFooter />
    </>
  );
}
