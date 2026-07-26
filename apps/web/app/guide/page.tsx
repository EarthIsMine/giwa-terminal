import type { Metadata } from "next";
import { GuideContent } from "@/components/guide-content";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

/**
 * 온보딩 가이드 — 주 동선은 하단 도크의 오버레이(X 닫기)이고,
 * 이 라우트는 딥링크·공유용으로 유지한다. 본문은 GuideContent 공용.
 */

export const metadata: Metadata = {
  title: "온보딩 가이드 — 나루 NARU",
  description:
    "업비트에서 기와(GIWA) 온체인으로 처음 건너오는 길: 지갑 준비, 출금, 브릿지, 첫 교환.",
};

export default function GuidePage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-[840px] px-8 pb-20 pt-12">
        <h1 className="font-serif text-[27px] font-bold tracking-tight">
          처음 건너오는 길
        </h1>
        <p className="mb-8 mt-2 text-[13px] leading-relaxed text-ink-3">
          업비트에서 기와 온체인까지 네 걸음입니다. 비용과 기다림은 겪기 전에
          미리 알려드립니다.
        </p>
        <GuideContent />
      </main>
      <SiteFooter />
    </>
  );
}
