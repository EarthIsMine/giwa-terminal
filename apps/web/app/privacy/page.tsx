import type { Metadata } from "next";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { PrivacyContent } from "@/components/legal/privacy-content";

/** 개인정보처리방침 - 조립 전용. 콘텐츠는 privacy-content(단일 소스). */

export const metadata: Metadata = {
  title: "개인정보처리방침 · 나루 NARU",
  description:
    "나루(NARU)는 개인정보를 수집·보관하지 않는 것을 원칙으로 설계되었습니다. 데모 단계 임시 문서입니다.",
};

export default function PrivacyPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-[760px] px-page pb-20 pt-8 sm:pt-12">
        <PrivacyContent />
      </main>
      <SiteFooter />
    </>
  );
}
