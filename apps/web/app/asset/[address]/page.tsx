import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AssetDetail } from "@/components/asset-detail";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { SEED_ASSETS } from "@/lib/seed-data";

function findAsset(address: string) {
  return SEED_ASSETS.find(
    (a) => a.address.toLowerCase() === address.toLowerCase(),
  );
}

export function generateStaticParams() {
  return SEED_ASSETS.map((a) => ({ address: a.address }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ address: string }>;
}): Promise<Metadata> {
  const { address } = await params;
  const asset = findAsset(address);
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
  const asset = findAsset(address);
  if (!asset) notFound();

  return (
    <>
      <SiteHeader />
      <main>
        <AssetDetail address={asset.address} />
      </main>
      <SiteFooter />
    </>
  );
}
