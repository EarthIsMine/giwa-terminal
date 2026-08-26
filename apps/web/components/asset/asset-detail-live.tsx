import Link from "next/link";
import type { HolderAnalysisWire } from "@/lib/analysis";
import type { AssetMarketWire, HolderGraphWire } from "@/lib/indexer";
import type { LiveAssetWire } from "@/lib/onchain";
import { AssetDetailAnalysis } from "@/components/asset/asset-detail-analysis";
import { AssetDetailChart } from "@/components/asset/asset-detail-chart";
import { AssetDetailHeader } from "@/components/asset/asset-detail-header";
import { AssetDetailInfo } from "@/components/asset/asset-detail-info";
import { TradePanel } from "@/components/asset/trade-panel";

/**
 * 자산 상세 - 온체인 실데이터 (목데이터 대체, 2026-07-22).
 * 차트·체결 내역은 인덱서(가격 API)에서 온다 (2026-07-23 연결).
 * 인덱서 미연결·데이터 없음이면 자리표시로 폴백 - 그 사실을 화면에 명시한다.
 * 섹션별 렌더는 헤더·차트·정보·분석 서브컴포넌트로 분리 (2026-07-27 리팩토링).
 */
export function AssetDetailLive({
  asset,
  ethKrw: ethKrwRaw,
  market,
  analysis,
  graph,
}: {
  asset: LiveAssetWire;
  ethKrw: string | null;
  market: AssetMarketWire | null;
  analysis: HolderAnalysisWire | null;
  graph: HolderGraphWire | null;
}) {
  const ethKrw = ethKrwRaw ? BigInt(ethKrwRaw) : null;

  return (
    <div className="mx-auto w-full max-w-page px-page pb-4 pt-6 sm:pt-10">
      <Link
        href="/"
        className="text-[12.5px] text-ink-3 transition-colors hover:text-ink-2"
      >
        ← 자산 목록
      </Link>

      {/* 헤더 */}
      <AssetDetailHeader asset={asset} ethKrw={ethKrw} />

      <div className="mt-8 flex flex-col items-start gap-5 xl:flex-row">
        {/* 좌: 차트·체결 - 인덱서 데이터. 미연결이면 자리표시 폴백 */}
        <div className="w-full min-w-0 flex-1 space-y-4">
          <AssetDetailChart
            market={market}
            symbol={asset.symbol}
            ethKrw={ethKrw}
          />
        </div>

        {/* 우: 거래 + 온체인 정보 */}
        <aside className="w-full shrink-0 space-y-4 xl:w-[400px]">
          <TradePanel asset={asset} ethKrw={ethKrwRaw} />
          <AssetDetailInfo asset={asset} ethKrw={ethKrw} />
        </aside>
      </div>

      <AssetDetailAnalysis analysis={analysis} graph={graph} />
    </div>
  );
}
