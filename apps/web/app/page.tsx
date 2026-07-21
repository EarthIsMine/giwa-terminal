import {
  formatCount,
  formatKrwCompact,
  wei,
  weiToDisplayKrw,
} from "@giwa/shared";
import { AssetBoard } from "@/components/asset-board";
import { Hero } from "@/components/hero";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { MOCK_ETH_KRW, NETWORK_STATS, SEED_ASSETS } from "@/lib/seed-data";

export default function Home() {
  // 자산별 거래대금 합산은 정의상 안전하다(quote 환산 합계).
  // 참여 인원은 중복 계상 문제로 네트워크 집계(distinct)를 쓴다 — 지표 정의 참고.
  const todayVolumeWei = wei(
    SEED_ASSETS.reduce((acc, a) => acc + (a.stats.today.volumeWei as bigint), 0n),
  );

  return (
    <>
      <SiteHeader />
      <main>
        <Hero
          assetCount={SEED_ASSETS.length}
          todayVolumeCompact={formatKrwCompact(
            weiToDisplayKrw(todayVolumeWei, MOCK_ETH_KRW),
          )}
          todayTraders={formatCount(NETWORK_STATS.today.distinctTraders)}
        />
        <section className="mx-auto w-full max-w-[1840px] px-8 pt-8">
          <AssetBoard />
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
