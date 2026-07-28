import type { Metadata } from "next";
import { AnalysisIntro } from "@/components/analysis/analysis-intro";
import { AnalysisStocksComing } from "@/components/analysis/analysis-stocks-coming";
import { AnalysisTabs } from "@/components/analysis/analysis-tabs";
import {
  AnalysisTokenBoard,
  type AnalysisTokenRow,
} from "@/components/analysis/analysis-token-board";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { getHolderAnalysis } from "@/lib/analysis";
import { getBoardStats } from "@/lib/indexer";
import { getLiveAssets } from "@/lib/onchain";

/**
 * 분석 (5면 구성 §분석 [토큰 · 온체인 주식]) — 하위 탭 2개.
 * 토큰: 보유 구조 비교 실데이터. 온체인 주식: 외부 데이터 원천 연결 전이라
 * 준비 중 패널 — 가짜 시세 대신 보드 구성과 확정 고지(조회 전용·파생상품)만
 * 미리 밝힌다 (팀 결정 2026-07-27, 빈 자리표시가 아니라 제품 정의 고지).
 */

export const metadata: Metadata = {
  title: "분석 · 나루 NARU",
  description:
    "상장 자산의 보유 구조 비교 — 홀더 수, 발행자 물량, 상위 지갑 집중도, 참여 인원. GIWA Sepolia 온체인 집계.",
};

/** Blockscout 홀더 집계 fetch 캐시(60초)와 보폭을 맞춘다 */
export const revalidate = 60;

export default async function AnalysisPage() {
  const [assets, boardStats] = await Promise.all([
    getLiveAssets(),
    getBoardStats(),
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
      <main className="mx-auto w-full max-w-[1280px] px-8 pb-20 pt-12">
        <AnalysisIntro />
        <AnalysisTabs
          token={<AnalysisTokenBoard rows={rows} />}
          stocks={<AnalysisStocksComing />}
        />
      </main>
      <SiteFooter />
    </>
  );
}
