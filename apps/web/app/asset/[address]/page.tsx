import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AssetDetailLive } from "@/components/asset-detail-live";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getAssetMarket } from "@/lib/indexer";
import { getEthKrw } from "@/lib/krw";
import { getLiveAsset } from "@/lib/onchain";

/** 온체인 실데이터 상세 — 주소는 동적, 15초 재생성 */
export const revalidate = 15;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ address: string }>;
}): Promise<Metadata> {
  const { address } = await params;
  const asset = await getLiveAsset(address);
  return {
    title: asset ? `${asset.symbol} ${asset.nameKo} — 나루` : "자산 — 나루",
  };
}

export default async function AssetPage({
  params,
}: {
  params: Promise<{ address: string }>;
}) {
  const { address } = await params;
  const [asset, ethKrw] = await Promise.all([getLiveAsset(address), getEthKrw()]);
  if (!asset) notFound();
  const market = await getAssetMarket(asset.pair);

  return (
    <>
      <SiteHeader />
      <main>
        <AssetDetailLive
          asset={asset}
          ethKrw={ethKrw?.toString() ?? null}
          market={market}
        />
      </main>
      <SiteFooter />
    </>
  );
}
