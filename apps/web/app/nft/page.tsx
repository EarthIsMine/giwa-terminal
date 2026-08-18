import type { Metadata } from "next";
import { NftComing } from "@/components/nft/nft-coming";
import { NftIntro } from "@/components/nft/nft-intro";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";

/**
 * NFT — 자리만 잡아둔 화면. 인덱서가 NFT(ERC-721) 전송을 아직 읽지 않아
 * 보여줄 실데이터가 없다. 가짜 컬렉션으로 채우지 않고 준비 중만 밝힌다.
 */

export const metadata: Metadata = {
  title: "NFT · 나루 NARU",
  description: "나루만의 NFT. 준비 중입니다.",
};

export default function NftPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-[1280px] px-page pb-20 pt-8 sm:pt-12">
        <NftIntro />
        <NftComing />
      </main>
      <SiteFooter />
    </>
  );
}
