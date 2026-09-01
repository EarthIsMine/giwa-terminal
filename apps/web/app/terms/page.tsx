import type { Metadata } from "next";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { TermsContent } from "@/components/legal/terms-content";

/** 이용약관 - 조립 전용. 콘텐츠는 terms-content(단일 소스). */

export const metadata: Metadata = {
  title: "이용약관 · 나루 NARU",
  description:
    "나루(NARU) 서비스 이용약관. 데모 단계 임시 문서로, 정식 서비스 출시 전 법률 검토를 거쳐 개정됩니다.",
};

export default function TermsPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-[760px] px-page pb-20 pt-8 sm:pt-12">
        <TermsContent />
      </main>
      <SiteFooter />
    </>
  );
}
