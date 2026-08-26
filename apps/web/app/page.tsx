import { formatEth, formatKrwCompact, wei, weiToDisplayKrw } from "@giwa/shared";
import { AssetBoard } from "@/components/asset/asset-board";
import { Hero } from "@/components/layout/hero";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { getBoardStats } from "@/lib/indexer";
import { getEthKrw } from "@/lib/krw";
import { getLiveAssets } from "@/lib/onchain";

/** 온체인 현재 상태 + 업비트 시세 - 15초 재생성으로 공개 RPC 부하를 묶는다 */
export const revalidate = 15;

export default async function Home() {
  const [assets, ethKrw, boardStats] = await Promise.all([
    getLiveAssets(),
    getEthKrw(),
    getBoardStats(),
  ]);

  // 총 예치 규모 = 전 자산 유동성 합 (풀 WETH 잔고 × 2의 합)
  const totalLiquidity = wei(
    assets.reduce((acc, a) => acc + BigInt(a.liquidityWei), 0n),
  );
  const depositDisplay = ethKrw
    ? `${formatKrwCompact(weiToDisplayKrw(totalLiquidity, ethKrw))}원`
    : `${formatEth(totalLiquidity, 4)} ETH`;

  return (
    <>
      <SiteHeader />
      <main>
        <Hero
          assetCount={assets.length}
          depositDisplay={depositDisplay}
          depositIsKrw={ethKrw !== null}
          ethKrwLabel={ethKrw ? `₩${Number(ethKrw).toLocaleString("ko-KR")}` : null}
        />
        {/* 보드는 컨테이너 없이 뷰포트 전폭으로 펼친다 - 내부에서 여백을 관리한다 */}
        <section className="w-full pt-8">
          <AssetBoard
            assets={assets}
            ethKrw={ethKrw?.toString() ?? null}
            boardStats={boardStats}
          />
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
